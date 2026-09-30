"""
JooTech Portfolio — Django API backend.

Serves:
  • /api/…   JSON API consumed by the React frontend
  • /admin/  Django admin to manage projects & read contact messages

All secrets come from environment variables (.env locally, Vercel env in prod).
"""
from pathlib import Path
import os

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env_list(name, default=""):
    return [v.strip() for v in os.environ.get(name, default).split(",") if v.strip()]


SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-insecure-key-change-me")
DEBUG = os.environ.get("DEBUG", "False").lower() == "true"

ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", ".vercel.app,localhost,127.0.0.1")
CSRF_TRUSTED_ORIGINS = env_list(
    "CSRF_TRUSTED_ORIGINS", "https://*.vercel.app,http://localhost:5173,http://127.0.0.1:5173"
)
# Origins allowed to call the API cross-origin (only needed if the frontend
# calls the backend directly instead of through the Vercel /api rewrite).
API_ALLOWED_ORIGINS = env_list(
    "API_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "cloudinary_storage",
    "django.contrib.staticfiles",
    "cloudinary",
    "adminsortable2",
    # Keep the app label "store": the existing Neon tables are store_project,
    # store_projectimage, store_projectparagraph, store_contactmessage.
    "store",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "store.middleware.ApiCorsMiddleware",
    "django.middleware.gzip.GZipMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

if DEBUG:
    MIDDLEWARE.append("store.middleware.ApiTimingMiddleware")

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"

# ─────────────── Database (Neon PostgreSQL) ───────────────
if os.environ.get("DATABASE_URL"):
    DATABASES = {
        "default": dj_database_url.parse(
            os.environ["DATABASE_URL"],
            conn_max_age=60,
            conn_health_checks=True,
            ssl_require=True,
        )
    }
else:  # local fallback
    DATABASES = {
        "default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}
    }

# Existing tables use 32-bit integer ids — keep this so no new migrations appear.
DEFAULT_AUTO_FIELD = "django.db.models.AutoField"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Cairo"
USE_I18N = True
USE_TZ = True

# ─────────────── Static (admin only) & Media (Cloudinary) ───────────────
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "static_root"
STATICFILES_DIRS = [BASE_DIR / "static"]
# WhiteNoise serves admin static straight from the app folders, so no
# collectstatic step is needed on Vercel.
WHITENOISE_USE_FINDERS = True
WHITENOISE_MAX_AGE = 60 * 60 * 24 * 30

MEDIA_URL = "/media/"

CLOUDINARY_STORAGE = {
    "CLOUD_NAME": os.environ.get("CLOUDINARY_CLOUD_NAME", ""),
    "API_KEY": os.environ.get("CLOUDINARY_API_KEY", ""),
    "API_SECRET": os.environ.get("CLOUDINARY_API_SECRET", ""),
    "SECURE": True,
}

STORAGES = {
    "default": {"BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
# django-cloudinary-storage still reads the legacy setting in its collectstatic.
STATICFILES_STORAGE = STORAGES["staticfiles"]["BACKEND"]

# ─────────────── Caching (in-process, per serverless instance) ───────────────
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
API_CACHE_SECONDS = int(os.environ.get("API_CACHE_SECONDS", "60"))

# ─────────────── AI helper in admin ───────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
AI_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# ─────────────── Email (contact form notifications) ───────────────
CONTACT_RECEIVER = os.environ.get("CONTACT_RECEIVER", "jootech3@gmail.com")
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_TIMEOUT = 8
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "jootech3@gmail.com")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = f"JooTech Portfolio <{EMAIL_HOST_USER}>"
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_FROM = os.environ.get("RESEND_FROM", "JooTech Portfolio <onboarding@resend.dev>")

# ─────────────── Security ───────────────
SESSION_ENGINE = "django.contrib.sessions.backends.signed_cookies"
SESSION_COOKIE_HTTPONLY = True
SECURE_CONTENT_TYPE_NOSNIFF = True
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "WARNING"},
}
