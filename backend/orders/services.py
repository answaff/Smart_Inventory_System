from decimal import Decimal

from django.db import transaction
from rest_framework.exceptions import ValidationError, PermissionDenied, NotFound

from products.models import Product
from inventory.models import StockMovement
from .models import Order, OrderItem
from config.permissions import has_role


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

    # Lock products during order creation
    products = {
        product.id: product
        for product in Product.objects.select_for_update()
        .filter(id__in=product_ids)
        .order_by("id")
    }

    total_amount = Decimal("0.00")
    prepared_items = []

    # Validate everything before creating the order
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

        prepared_items.append({
            "product": product,
            "quantity": quantity,
            "unit_price": unit_price,
            "subtotal": subtotal
        })

    if total_amount > Decimal("9999999999.99"):
        raise ValidationError({
            "items": "Order total exceeds the allowed limit."
        })

    # Create the order
    order = Order.objects.create(
        customer=customer,
        created_by=user,
        status="PLACED",
        total_amount=total_amount,
        notes=notes
    )

    # Check whether subtotal is a database field
    subtotal_is_stored = any(
        field.name == "subtotal"
        for field in OrderItem._meta.concrete_fields
    )

    # Save order items and update inventory
    for item in prepared_items:

        product = item["product"]
        quantity = item["quantity"]

        order_item_data = {
            "order": order,
            "product": product,
            "quantity": quantity,
            "unit_price": item["unit_price"]
        }

        if subtotal_is_stored:
            order_item_data["subtotal"] = item["subtotal"]

        # Save the order item
        OrderItem.objects.create(**order_item_data)

        # Deduct stock exactly once
        product.stock_quantity -= quantity
        product.save(update_fields=["stock_quantity"])

        # Record the inventory movement
        StockMovement.objects.create(
            product=product,
            movement_type="OUT",
            quantity=quantity,
            notes=(
                f"Automatic stock deduction for Order #{order.id}"
            ),
            created_by=user
        )

    # Return the completed order
    return order

     

@transaction.atomic
def cancel_order(order_id, user):

    # Check authentication
    if not user or not user.is_authenticated:
        raise PermissionDenied(
            "Authentication required."
        )

    # Check Inventory Admin or Staff role
    allowed = (
        has_role(user, "Inventory Admin")
        or has_role(user, "Inventory Staff")
    )

    if not allowed:
        raise PermissionDenied(
            "Inventory Admin or Staff permission required."
        )

    # Lock order to prevent simultaneous cancellation
    order = Order.objects.select_for_update().filter(
        id=order_id
    ).first()

    if order is None:
        raise NotFound("Order not found.")

    # Only PLACED orders can be cancelled
    if order.status != "PLACED":
        raise ValidationError({
            "status": "Only PLACED orders can be cancelled."
        })

    # Validate saved order items
    order_items = list(order.items.all())

    if not order_items:
        raise ValidationError({
            "items": "Order contains no items."
        })

    # Lock affected products
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

    # Restore stock and record movements
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
            notes=(
                f"Stock restored after cancelling Order #{order.id}"
            ),
            created_by=user
        )

    # Mark order as cancelled
    order.status = "CANCELLED"

    order.save(
        update_fields=["status", "updated_at"]
    )

    return order



@transaction.atomic
def complete_order(order_id, user):

    # Check authentication
    if not user or not user.is_authenticated:
        raise PermissionDenied(
            "Authentication required."
        )

    # Allow Inventory Admin and Inventory Staff
    allowed = (
        has_role(user, "Inventory Admin")
        or has_role(user, "Inventory Staff")
    )

    if not allowed:
        raise PermissionDenied(
            "Inventory Admin or Staff permission required."
        )

    # Lock order to prevent simultaneous status changes
    order = Order.objects.select_for_update().filter(
        pk=order_id
    ).first()

    if order is None:
        raise NotFound("Order not found.")

    # Only PLACED orders can be completed
    if order.status != "PLACED":
        raise ValidationError({
            "status": "Only PLACED orders can be completed."
        })

    # Prevent completing invalid or empty orders
    if not order.items.exists():
        raise ValidationError({
            "items": "Cannot complete an order without items."
        })

    # Mark order as completed
    order.status = "COMPLETED"
    order.save(
        update_fields=["status", "updated_at"]
    )

    return order
