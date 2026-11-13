from django.urls import path
from .dashboard_views import DashboardSummaryView

urlpatterns = [
    path(
        "dashboard/",
        DashboardSummaryView.as_view(),
        name="dashboard-summary"
    ),
]