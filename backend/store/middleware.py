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


class ApiTimingMiddleware:
    """DEBUG only: prints how long each /api request took and how many DB queries it ran.
    Helps spot slow requests while developing (e.g. far-away database latency)."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.path.startswith("/api/"):
            return self.get_response(request)
        import time

        from django.db import connection

        start = time.perf_counter()
        before = len(connection.queries)
        response = self.get_response(request)
        took = time.perf_counter() - start
        queries = len(connection.queries) - before
        db_time = sum(float(q.get("time", 0)) for q in connection.queries[before:])
        print(f"[api] {request.method} {request.path} -> {response.status_code} in {took:.2f}s "
              f"(db: {queries} queries, {db_time:.2f}s)")
        return response
