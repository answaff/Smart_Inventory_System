from decimal import Decimal

from django.db import transaction
from rest_framework.exceptions import ValidationError, PermissionDenied, NotFound

from products.models import Product
from inventory.models import StockMovement
from .models import Order, OrderItem


@transaction.atomic
def create_order(validated_data, user):

    if not user or not user.is_authenticated:
        raise PermissionDenied("Authentication required.")

    customer = validated_data["customer"]
    items = validated_data["items"]
    notes = validated_data.get("notes", "")

    product_ids = [item["product"].id for item in items]

    if not product_ids:
        raise ValidationError({
            "items": "An order must contain at least one product."
        })

    if len(product_ids) != len(set(product_ids)):
        raise ValidationError({
            "items": "Duplicate products are not allowed."
        })

    # Lock product rows to prevent concurrent stock changes
    products = {
        product.id: product
        for product in Product.objects.select_for_update()
        .filter(id__in=product_ids)
        .order_by("id")
    }

    total_amount = Decimal("0.00")
    order_items = []

    # Validate all products before changing the database
    for item in items:
        product_id = item["product"].id
        quantity = item["quantity"]

        product = products.get(product_id)

        if product is None or not product.is_active:
            raise ValidationError({
                "items": f"Product {product_id} is unavailable."
            })

        if quantity <= 0:
            raise ValidationError({
                "quantity": "Quantity must be greater than zero."
            })

        if product.price < 0:
            raise ValidationError({
                "items": f"Invalid price for {product.name}."
            })

        if product.stock_quantity < quantity:
            raise ValidationError({
                "items": (
                    f"Insufficient stock for {product.name}. "
                    f"Available: {product.stock_quantity}"
                )
            })

        unit_price = product.price
        subtotal = unit_price * quantity
        total_amount += subtotal

        order_items.append({
            "product": product,
            "quantity": quantity,
            "unit_price": unit_price
        })

    if total_amount > Decimal("9999999999.99"):
        raise ValidationError({
            "items": "Order total exceeds the allowed limit."
        })

    # Create order
    order = Order.objects.create(
        customer=customer,
        created_by=user,
        status="PLACED",
        total_amount=total_amount,
        notes=notes
    )
    
     
@transaction.atomic
def cancel_order(order_id, user):

    if not user or not user.is_authenticated:
        raise PermissionDenied("Authentication required.")

    order = Order.objects.select_for_update().filter(
        id=order_id
    ).first()

    if order is None:
        raise NotFound("Order not found.")

    if not (
        user.is_staff
        or user.is_superuser
        or order.created_by_id == user.id
    ):
        raise PermissionDenied(
            "You do not have permission to cancel this order."
        )

    if order.status != "PLACED":
        raise ValidationError({
            "status": "Only PLACED orders can be cancelled."
        })

    order_items = list(order.items.all())

    if not order_items:
        raise ValidationError({
            "items": "Order contains no items."
        })

    product_ids = sorted({
        item.product_id for item in order_items
    })

    products = {
        product.id: product
        for product in Product.objects.select_for_update()
        .filter(id__in=product_ids)
        .order_by("id")
    }

    if len(products) != len(product_ids):
        raise ValidationError({
            "items": "One or more products are missing."
        })

    for item in order_items:
        product = products[item.product_id]

        product.stock_quantity += item.quantity
        product.save(
            update_fields=["stock_quantity", "updated_at"]
        )

        StockMovement.objects.create(
            product=product,
            movement_type="IN",
            quantity=item.quantity,
            notes=f"Stock restored after cancelling Order #{order.id}",
            created_by=user
        )

    order.status = "CANCELLED"
    order.save(
        update_fields=["status", "updated_at"]
    )

    return order