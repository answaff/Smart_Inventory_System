
from decimal import Decimal

from django.db.models import F, Sum, DecimalField, ExpressionWrapper
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from products.models import Product
from orders.models import Order


class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()

        # Active products
        products = Product.objects.filter(is_active=True)

        total_products = products.count()

        # Total stock and inventory value
        stock_data = products.aggregate(
            total_stock=Sum("stock_quantity"),
            stock_value=Sum(
                ExpressionWrapper(
                    F("price") * F("stock_quantity"),
                    output_field=DecimalField(
                        max_digits=20,
                        decimal_places=2,
                    ),
                )
            ),
        )

        total_stock = stock_data["total_stock"] or 0
        stock_value = stock_data["stock_value"] or Decimal("0.00")

        # Low-stock alerts
        low_stock_count = products.filter(
            stock_quantity__lte=F("low_stock_threshold")
        ).count()

        # Orders created today
        orders_today = Order.objects.filter(
            created_at__date=today
        ).count()

        # Completed sales today
        sales_today = Order.objects.filter(
            status="COMPLETED",
            updated_at__date=today,
        ).aggregate(
            total=Sum("total_amount")
        )["total"] or Decimal("0.00")

        # Overall order statistics
        total_orders = Order.objects.count()

        placed_orders = Order.objects.filter(
            status="PLACED"
        ).count()

        completed_orders = Order.objects.filter(
            status="COMPLETED"
        ).count()

        cancelled_orders = Order.objects.filter(
            status="CANCELLED"
        ).count()

        return Response({
            "date": str(today),
            "total_products": total_products,
            "total_stock": total_stock,
            "stock_value": str(stock_value),
            "low_stock_count": low_stock_count,
            "orders_today": orders_today,
            "sales_today": str(sales_today),
            "total_orders": total_orders,
            "orders_by_status": {
                "placed": placed_orders,
                "completed": completed_orders,
                "cancelled": cancelled_orders,
            },
        })
