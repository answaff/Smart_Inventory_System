
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .permissions import (
    has_role,
    ADMIN_ROLE,
    STAFF_ROLE,
)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_user(request):
    user = request.user

    is_admin = has_role(user, ADMIN_ROLE)
    is_inventory_staff = has_role(user, STAFF_ROLE)

    if is_admin:
        role = "Inventory Admin"
    elif is_inventory_staff:
        role = "Inventory Staff"
    else:
        role = "No inventory role"

    return Response({
        "id": user.id,
        "username": user.get_username(),
        "role": role,
        "can_view_products": is_admin or is_inventory_staff,
        "can_manage_products": is_admin,
    })
