
from rest_framework.permissions import BasePermission
from rest_framework.permissions import SAFE_METHODS


ADMIN_ROLE = "Inventory Admin"
STAFF_ROLE = "Inventory Staff"


def has_role(user, role_name):
    if not user or not user.is_authenticated:
        return False

    if not user.is_active:
        return False

    # Superusers have all inventory permissions
    if user.is_superuser:
        return True

    return user.groups.filter(name=role_name).exists()


class IsInventoryAdmin(BasePermission):
    message = "Inventory Admin permission required."

    def has_permission(self, request, view):
        return has_role(request.user, ADMIN_ROLE)


class IsInventoryAdminOrStaff(BasePermission):
    message = "Inventory Admin or Staff permission required."

    def has_permission(self, request, view):
        return (
            has_role(request.user, ADMIN_ROLE)
            or has_role(request.user, STAFF_ROLE)
        )


class IsInventoryAdminWriteOrStaffRead(BasePermission):
    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):

        # Admin and Staff can view products
        if request.method in SAFE_METHODS:
            return (
                has_role(request.user, ADMIN_ROLE)
                or has_role(request.user, STAFF_ROLE)
            )

        # Only Admin can add, edit or delete products
        return has_role(request.user, ADMIN_ROLE)
