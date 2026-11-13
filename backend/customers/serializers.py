from rest_framework import serializers
from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):

    class Meta:
        model = Customer

        fields = [
            "id",
            "name",
            "email",
            "phone",
            "address",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate_name(self, value):
        name = value.strip()

        if len(name) < 2:
            raise serializers.ValidationError(
                "Customer name must contain at least 2 characters."
            )

        return name

    def validate_phone(self, value):
        phone = value.strip()

        if not phone.isdigit() or not 10 <= len(phone) <= 15:
            raise serializers.ValidationError(
                "Phone number must contain 10 to 15 digits."
            )

        return phone

    def validate_email(self, value):
        return value.strip().lower()