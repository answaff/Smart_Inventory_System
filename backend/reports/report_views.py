from decimal import Decimal

from django.db.models import (
    Count,
    DecimalField,
    F,
    Sum,
)
from django.db.models.functions import TruncDate

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema

from products.models import Product
from orders.models import Order
from orders.serializers import OrderSerializer
from config.permissions import IsInventoryAdminOrStaff
import re
from datetime import date
from rest_framework.exceptions import ValidationError
from orders.models import OrderItem
from inventory.models import StockMovement


# -------------------------------
# SALES REPORT API
# -------------------------------


class SalesReportView(APIView):
    permission_classes = [IsAuthenticated, IsInventoryAdminOrStaff]

    @extend_schema(
        summary="Sales Report",
        description="Sales statistics for completed orders."
    )
    def get(self, request):

        # Validate an optional YYYY-MM-DD query parameter
        def parse_date_filter(field_name):
            raw_value = request.query_params.get(field_name)

            if raw_value is None:
                return None

            if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw_value):
                raise ValidationError({
                    field_name: "Date must use YYYY-MM-DD format."
                })

            try:
                return date.fromisoformat(raw_value)
            except ValueError:
                raise ValidationError({
                    field_name: "Invalid calendar date."
                })

        start_date = parse_date_filter("start_date")
        end_date = parse_date_filter("end_date")

        # Prevent an invalid date range
        if start_date and end_date and start_date > end_date:
            raise ValidationError({
                "date_range": "start_date cannot be after end_date."
            })

        # Only completed orders count as sales
        completed_orders = Order.objects.filter(
            status="COMPLETED"
        )

        # Apply inclusive date-range filtering
        if start_date:
            completed_orders = completed_orders.filter(
                created_at__date__gte=start_date
            )

        if end_date:
            completed_orders = completed_orders.filter(
                created_at__date__lte=end_date
            )

        # Keep the remaining existing code below unchanged


        total_completed_orders = completed_orders.count()

        total_sales = completed_orders.aggregate(
            total=Sum("total_amount")
        )["total"] or Decimal("0.00")

        # Group completed orders by their creation date
        daily_sales = (
            completed_orders
            .annotate(order_date=TruncDate("created_at"))
            .values("order_date")
            .annotate(
                order_count=Count("id"),
                revenue=Sum("total_amount")
            )
            .order_by("order_date")
        )

        sales_by_date = [
            {
                "date": row["order_date"].isoformat(),
                "order_count": row["order_count"],
                "revenue": str(row["revenue"]),
            }
            for row in daily_sales
        ]

        recent_orders = (
            completed_orders
            .select_related("customer", "created_by")
            .prefetch_related("items__product")
            .order_by("-created_at")[:10]
        )

        data = {
            "total_completed_orders": total_completed_orders,
            "total_sales": str(total_sales),
            "sales_by_date": sales_by_date,
            "recent_completed_orders": OrderSerializer(
                recent_orders,
                many=True
            ).data,
        }

        return Response(data)


# -------------------------------
# INVENTORY REPORT API
# -------------------------------

class InventoryReportView(APIView):
    permission_classes = [IsAuthenticated,  IsInventoryAdminOrStaff]

    @extend_schema(
        summary="Inventory Report",
        description="Current product stock and inventory valuation."
    )
    def get(self, request):

        products = (
            Product.objects
            .filter(is_active=True)
            .select_related("category")
            .order_by("id")
        )

        total_products = products.count()

        summary = products.aggregate(
            total_stock=Sum("stock_quantity"),
            total_value=Sum(
                F("stock_quantity") * F("price"),
                output_field=DecimalField(
                    max_digits=22,
                    decimal_places=2
                )
            )
        )

        total_stock = summary["total_stock"] or 0

        total_value = (
            summary["total_value"] or Decimal("0.00")
        )

        low_stock_count = products.filter(
            stock_quantity__lte=F("low_stock_threshold")
        ).count()

        product_list = []

        for product in products:

            if product.stock_quantity == 0:
                stock_status = "OUT_OF_STOCK"

            elif (
                product.stock_quantity
                <= product.low_stock_threshold
            ):
                stock_status = "LOW_STOCK"

            else:
                stock_status = "IN_STOCK"

            product_list.append({
                "id": product.id,
                "name": product.name,
                "sku": product.sku,
                "category": product.category.name,
                "price": str(product.price),
                "stock_quantity": product.stock_quantity,
                "low_stock_threshold": product.low_stock_threshold,
                "stock_status": stock_status,
                "stock_value": str(
                    product.price * product.stock_quantity
                ),
            })


        recent_movements = [
            {
                "id": m.id,
                "product_id": m.product_id,
                "product": m.product.name,
                "movement_type": m.movement_type,
                "quantity": m.quantity,
                "notes": m.notes,
                "created_by_id": m.created_by_id,
                "created_at": m.created_at.isoformat(),
            }
            for m in StockMovement.objects
            .select_related("product")
            .order_by("-created_at", "-id")[:10]
        ]


        
        data = {
            "total_products": total_products,
            "total_stock": total_stock,
            "low_stock_products": low_stock_count,
            "estimated_retail_stock_value": str(total_value),
            "products": product_list,
            "recent_movements": recent_movements,
        }

        return Response(data)


class ProductSalesReportView(APIView):
    permission_classes = [IsAuthenticated, IsInventoryAdminOrStaff]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        def validate_date(value):
            if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
                raise ValidationError({"date": "Use YYYY-MM-DD."})
            try:
                return date.fromisoformat(value)
            except ValueError:
                raise ValidationError({"date": "Invalid date."})

        start = validate_date(start_date) if start_date is not None else None
        end = validate_date(end_date) if end_date is not None else None

        if start and end and start > end:
            raise ValidationError({
                "date_range": "start_date cannot be after end_date."
            })

        items = OrderItem.objects.filter(order__status="COMPLETED")

        if start:
            items = items.filter(order__created_at__date__gte=start)

        if end:
            items = items.filter(order__created_at__date__lte=end)

        products = (
            items.values("product_id", "product__name", "product__sku")
            .annotate(
                units_sold=Sum("quantity"),
                revenue=Sum(
                    F("quantity") * F("unit_price"),
                    output_field=DecimalField(
                        max_digits=22, decimal_places=2
                    )
                )
            )
            .order_by("-units_sold", "product_id")
        )

        results = [
            {
                "product_id": p["product_id"],
                "name": p["product__name"],
                "sku": p["product__sku"],
                "units_sold": p["units_sold"],
                "revenue": str(p["revenue"]),
            }
            for p in products
        ]

        return Response({
            "total_products_sold": len(results),
            "total_units_sold": sum(p["units_sold"] for p in results),
            "total_revenue": str(sum(
                (Decimal(p["revenue"]) for p in results),
                Decimal("0.00")
            )),
            "products": results,
        })

