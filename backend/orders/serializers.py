from decimal import Decimal
from rest_framework import serializers

from customers.models import Customer
from products.models import Product
from .models import Order, OrderItem


# Serializer for displaying order items
class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.name",
        read_only=True
    )

    subtotal = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product",
            "product_name",
            "quantity",
            "unit_price",
            "subtotal",
        ]


# Serializer for displaying orders
class OrderSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source="customer.name",
        read_only=True
    )

    items = OrderItemSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = Order
        fields = [
            "id",
            "customer",
            "customer_name",
            "created_by",
            "status",
            "items",
            "total_amount",
            "notes",
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields


# Serializer for accepting products in a new order
class OrderItemCreateSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_active=True)
    )

    quantity = serializers.IntegerField(min_value=1)


# Serializer for creating orders
class OrderCreateSerializer(serializers.Serializer):
    customer = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all()
    )

    items = OrderItemCreateSerializer(
        many=True,
        allow_empty=False
    )

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        default=""
    )

    def validate_items(self, items):
        product_ids = [
            item["product"].id for item in items
        ]

        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError(
                "Duplicate products are not allowed."
            )

        for item in items:
            product = item["product"]
            quantity = item["quantity"]

            if product.price < 0:
                raise serializers.ValidationError(
                    f"Invalid price for {product.name}."
                )

            if quantity > product.stock_quantity:
                raise serializers.ValidationError(
                    f"Insufficient stock for {product.name}. "
                    f"Available: {product.stock_quantity}"
                )

        return items

    def validate(self, attrs):
        total = sum(
            (
                item["product"].price * item["quantity"]
                for item in attrs["items"]
            ),
            Decimal("0.00")
        )

        attrs["calculated_total"] = total

        return attrs