from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)


def home(request):
    return JsonResponse({
        "status": "success",
        "message": "Smart Inventory API is running",
        "documentation": "/api/docs/",
    })
    
    
urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/", include("products.urls")),
    
    path("", home, name="home"),
    
    path("api/inventory/", include("inventory.urls")),
    
    path("api/", include("customers.urls")),
    
    path("api/", include("orders.urls")),

    path("api/", include("reports.urls")),

    path(
        "api/token/",
        TokenObtainPairView.as_view(),
        name="token_obtain_pair",
    ),
    path(
        "api/token/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),

    path(
        "api/schema/",
        SpectacularAPIView.as_view(),
        name="schema",
    ),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(
            url_name="schema"
        ),
        name="swagger-ui",
    ),
]