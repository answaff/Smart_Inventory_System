from decimal import Decimal

from django.db.models import F, Sum
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema

from products.models import Product
from customers.models import Customer
from orders.models import Order


class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Dashboard summary",
        description="Returns product, inventory, order and sales statistics."
    )
    def get(self, request):

        active_products = Product.objects.filter(is_active=True)

        total_products = active_products.count()

        total_stock = (
            active_products.aggregate(
                total=Sum("stock_quantity")
            )["total"] or 0
        )

        low_stock_products = active_products.filter(
            stock_quantity__lte=F("low_stock_threshold")
        ).count()

        total_customers = Customer.objects.count()

        total_orders = Order.objects.count()

        active_orders = Order.objects.filter(
            status="PLACED"
        ).count()

        completed_orders = Order.objects.filter(
            status="COMPLETED"
        ).count()

        cancelled_orders = Order.objects.filter(
            status="CANCELLED"
        ).count()

        total_sales = (
            Order.objects.filter(
                status="COMPLETED"
            ).aggregate(
                total=Sum("total_amount")
            )["total"] or Decimal("0.00")
        )

        data = {
            "total_products": total_products,
            "total_stock": total_stock,
            "low_stock_products": low_stock_products,
            "total_customers": total_customers,
            "total_orders": total_orders,
            "active_orders": active_orders,
            "completed_orders": completed_orders,
            "cancelled_orders": cancelled_orders,
            "total_sales": str(total_sales),
        }

        return Response(data)