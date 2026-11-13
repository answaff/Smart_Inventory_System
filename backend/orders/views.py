from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from .models import Order
from .serializers import OrderSerializer, OrderCreateSerializer
from .services import create_order, cancel_order


class OrderViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet
):

    queryset = Order.objects.select_related(
        "customer",
        "created_by"
    ).prefetch_related(
        "items__product"
    ).order_by("-created_at")

    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return OrderCreateSerializer

        return OrderSerializer

    @extend_schema(
        request=OrderCreateSerializer,
        responses={201: OrderSerializer}
    )
    def create(self, request, *args, **kwargs):

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order = create_order(
            validated_data=serializer.validated_data,
            user=request.user
        )

        response_serializer = OrderSerializer(
            order,
            context=self.get_serializer_context()
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )

    @extend_schema(
        request=None,
        responses={200: OrderSerializer}
    )
    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):

        order = cancel_order(
            order_id=pk,
            user=request.user
        )

        serializer = OrderSerializer(
            order,
            context=self.get_serializer_context()
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )