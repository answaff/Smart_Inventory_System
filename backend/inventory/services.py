from django.db import transaction
from rest_framework.exceptions import ValidationError

from products.models import Product
from .models import StockMovement


@transaction.atomic
def adjust_stock(*, product_id, quantity, movement_type, user, notes=""):
    if quantity <= 0:
        raise ValidationError(
            {"quantity": "Quantity must be greater than zero."}
        )

    if movement_type not in ("IN", "OUT"):
        raise ValidationError(
            {"movement_type": "Invalid movement type."}
        )

    product = Product.objects.select_for_update().get(
        pk=product_id,
        is_active=True
    )

    if movement_type == "OUT":
        if product.stock_quantity < quantity:
            raise ValidationError({
                "quantity": (
                    "Insufficient stock. "
                    f"Available: {product.stock_quantity}"
                )
            })
        product.stock_quantity -= quantity
    else:
        product.stock_quantity += quantity

    product.save(update_fields=["stock_quantity", "updated_at"])

    movement = StockMovement.objects.create(
        product=product,
        movement_type=movement_type,
        quantity=quantity,
        notes=notes,
        created_by=user
    )

    return movement