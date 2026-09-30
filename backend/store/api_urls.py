from django.urls import include, re_path

from . import api

# Trailing slash optional: proxies/rewrites sometimes drop it, and an
# APPEND_SLASH redirect would break POST requests.
urlpatterns = [
    re_path(r"^$", api.index),
    re_path(r"^health/?$", api.health),
    re_path(r"^projects/?$", api.projects),
    re_path(r"^projects/(?P<pk>\d+)/?$", api.project_detail),
    re_path(r"^contact/?$", api.contact),
    re_path(r"^dashboard/", include("store.dashboard_urls")),
]
