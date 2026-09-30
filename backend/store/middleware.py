from django.conf import settings
from django.http import HttpResponse


class ApiCorsMiddleware:
    """Tiny CORS handler for /api/ only (no extra dependency).

    In production the frontend reaches the API through a same-origin Vercel
    rewrite, so this only matters for local dev or a direct cross-origin setup.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.path.startswith("/api/"):
            return self.get_response(request)

        origin = request.headers.get("Origin", "")
        allowed = origin and (origin in settings.API_ALLOWED_ORIGINS or "*" in settings.API_ALLOWED_ORIGINS)

        if request.method == "OPTIONS" and allowed:
            response = HttpResponse(status=204)
        else:
            response = self.get_response(request)

        if allowed:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Methods"] = "GET, POST, PATCH, PUT, DELETE, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            response["Access-Control-Max-Age"] = "86400"
            response["Vary"] = "Origin"
        return response
