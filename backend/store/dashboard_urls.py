from django.urls import re_path

from . import dashboard as d

# All routes accept an optional trailing slash (see api_urls.py).
urlpatterns = [
    re_path(r"^login/?$", d.login),
    re_path(r"^me/?$", d.me),
    re_path(r"^stats/?$", d.stats),
    re_path(r"^projects/?$", d.projects),
    re_path(r"^projects/reorder/?$", d.projects_reorder),
    re_path(r"^projects/(?P<pk>\d+)/?$", d.project_detail),
    re_path(r"^projects/(?P<pk>\d+)/images/?$", d.project_images),
    re_path(r"^projects/(?P<pk>\d+)/images/reorder/?$", d.project_images_reorder),
    re_path(r"^images/(?P<pk>\d+)/?$", d.image_detail),
    re_path(r"^messages/?$", d.messages),
    re_path(r"^messages/read-all/?$", d.messages_read_all),
    re_path(r"^messages/(?P<pk>\d+)/?$", d.message_detail),
    re_path(r"^settings/hero/?$", d.hero),
    re_path(r"^ai/?$", d.ai),
]
