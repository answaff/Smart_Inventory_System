from django.urls import path

from .dashboard_views import DashboardSummaryView
from .report_views import (
    SalesReportView,
    InventoryReportView,
    ProductSalesReportView,
)

urlpatterns = [
    path(
        "dashboard/",
        DashboardSummaryView.as_view(),
        name="dashboard-summary"
    ),

    path(
        "reports/sales/",
        SalesReportView.as_view(),
        name="sales-report"
    ),

    path(
        "reports/inventory/",
        InventoryReportView.as_view(),
        name="inventory-report"
    ),

    path(
    "reports/products/",
    ProductSalesReportView.as_view(),
    name="product-sales-report"
),
]