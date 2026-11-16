
from django.db import transaction
from django.db.models.deletion import ProtectedError

from rest_framework import viewsets, filters
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from config.permissions import IsInventoryAdminOrStaff

from orders.models import Order

from .models import Customer
from .serializers import CustomerSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by("-created_at")
    serializer_class = CustomerSerializer

    permission_classes = [
        IsAuthenticated,
        IsInventoryAdminOrStaff,
    ]

    filter_backends = [filters.SearchFilter]

    search_fields = [
        "name",
        "email",
        "phone",
    ]

    # ==========================================
    # SAFE CUSTOMER DELETE
    # ==========================================

    def perform_destroy(self, instance):
        with transaction.atomic():

            # Lock customer record during deletion
            customer = Customer.objects.select_for_update().get(
                pk=instance.pk
            )

            # Prevent deletion if customer has orders
            has_orders = Order.objects.filter(
                customer_id=customer.id
            ).exists()

            if has_orders:
                raise ValidationError({
                    "detail": (
                        "Cannot delete this customer because "
                        "they have existing order history."
                    )
                })

            # Delete customers without protected records
            try:
                customer.delete()

            except ProtectedError:
                raise ValidationError({
                    "detail": (
                        "Cannot delete this customer because "
                        "they are linked to protected records."
                    )
                })
