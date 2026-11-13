from django.urls import path

from .views import (
    stock_in,
    stock_out,
    StockMovementListView,
    LowStockListView,
)

urlpatterns = [
    path("stock-in/", stock_in, name="stock-in"),
    path("stock-out/", stock_out, name="stock-out"),
    path(
        "movements/",
        StockMovementListView.as_view(),
        name="stock-movements"
    ),
    path(
        "low-stock/",
        LowStockListView.as_view(),
        name="low-stock"
    ),
]