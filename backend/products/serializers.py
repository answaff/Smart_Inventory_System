from rest_framework import serializers
from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "description"]


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source="category.name",
        read_only=True
    )

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "sku",
            "category",
            "category_name",
            "description",
            "price",
            "stock_quantity",
            "low_stock_threshold",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


    def validate_stock_quantity(self, value):
        # Reject direct stock updates to existing products
        if self.instance is not None:
            raise serializers.ValidationError(
                "Stock quantity cannot be updated through "
                "the Product API. Use Inventory Management."
            )

        # New products must start with zero stock
        if value != 0:
            raise serializers.ValidationError(
                "Initial stock must be 0. "
                "Use Stock-In to add inventory."
            )

        return value

    def create(self, validated_data):
        # Always initialize new products with zero stock
        validated_data["stock_quantity"] = 0

        return super().create(validated_data)


    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Price cannot be negative."
            )
        return value