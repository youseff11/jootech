from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path

admin.site.site_header = "JooTech — Portfolio Admin"
admin.site.site_title = "JooTech Admin"
admin.site.index_title = "Manage projects & messages"


def root(_request):
    return JsonResponse({"service": "jootech-portfolio-api", "docs": "/api/"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("store.api_urls")),
    path("", root),
]
