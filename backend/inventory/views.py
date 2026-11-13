from django.db.models import F
from drf_spectacular.utils import extend_schema

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from products.models import Product
from products.serializers import ProductSerializer

from .models import StockMovement
from .serializers import (
    StockMovementSerializer,
    StockAdjustmentSerializer,
)
from .services import adjust_stock


# ==========================================
# STOCK IN API
# ==========================================

@extend_schema(
    request=StockAdjustmentSerializer,
    responses={201: StockMovementSerializer},
    description="Add stock to an existing product.",
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def stock_in(request):
    serializer = StockAdjustmentSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    data = serializer.validated_data

    movement = adjust_stock(
        product_id=data["product"].id,
        quantity=data["quantity"],
        movement_type="IN",
        notes=data["notes"],
        user=request.user,
    )

    return Response(
        StockMovementSerializer(movement).data,
        status=status.HTTP_201_CREATED,
    )


# ==========================================
# STOCK OUT API
# ==========================================

@extend_schema(
    request=StockAdjustmentSerializer,
    responses={201: StockMovementSerializer},
    description="Remove stock from an existing product.",
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def stock_out(request):
    serializer = StockAdjustmentSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    data = serializer.validated_data

    movement = adjust_stock(
        product_id=data["product"].id,
        quantity=data["quantity"],
        movement_type="OUT",
        notes=data["notes"],
        user=request.user,
    )

    return Response(
        StockMovementSerializer(movement).data,
        status=status.HTTP_201_CREATED,
    )


# ==========================================
# STOCK MOVEMENT HISTORY API
# ==========================================

class StockMovementListView(generics.ListAPIView):
    queryset = StockMovement.objects.select_related(
        "product",
        "created_by",
    ).all()

    serializer_class = StockMovementSerializer
    permission_classes = [IsAuthenticated]


# ==========================================
# LOW STOCK PRODUCTS API
# ==========================================

class LowStockListView(generics.ListAPIView):
    queryset = Product.objects.filter(
        is_active=True,
        stock_quantity__lte=F("low_stock_threshold"),
    ).select_related("category")

    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]