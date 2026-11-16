from django.shortcuts import render
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated

from django.db import transaction
from rest_framework.exceptions import ValidationError

from orders.models import OrderItem
from inventory.models import StockMovement

from config.permissions import IsInventoryAdminWriteOrStaffRead
from .models import Category, Product
from .serializers import (
    CategorySerializer,
    ProductSerializer,
)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by("id")
    serializer_class = CategorySerializer
    permission_classes = [
            IsAuthenticated,
            IsInventoryAdminWriteOrStaffRead
        ]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related(
        "category"
    ).all().order_by("id")

    serializer_class = ProductSerializer
    permission_classes = [
        IsAuthenticated,
        IsInventoryAdminWriteOrStaffRead
    ]

    filter_backends = [filters.SearchFilter]
    search_fields = [
        "name",
        "sku",
        "description",
        "category__name",
    ]


    def perform_destroy(self, instance):
        with transaction.atomic():

            product = Product.objects.select_for_update().get(
                pk=instance.pk
            )

            # Protect products referenced by orders
            if OrderItem.objects.filter(
                product=product
            ).exists():
                raise ValidationError({
                    "detail": (
                        "Cannot delete this product because "
                        "it is referenced by an order. "
                        "Deactivate the product instead."
                    )
                })

            # Protect inventory movement history
            if StockMovement.objects.filter(
                product=product
            ).exists():
                raise ValidationError({
                    "detail": (
                        "Cannot delete this product because "
                        "stock movement history exists. "
                        "Deactivate the product instead."
                    )
                })

            # Prevent unrecorded stock removal
            if product.stock_quantity != 0:
                raise ValidationError({
                    "detail": (
                        "Cannot delete a product with remaining stock. "
                        "Use Inventory Management first."
                    )
                })

            # Safe deletion
            product.delete()
