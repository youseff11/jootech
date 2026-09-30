from django.apps import AppConfig


class StoreConfig(AppConfig):
    name = "store"
    verbose_name = "Portfolio"

    def ready(self):
        from . import api  # noqa: F401  (registers cache-busting signals)
