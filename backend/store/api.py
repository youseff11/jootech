"""JSON API for the React frontend."""
import json
import logging
import re
import urllib.request

from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.mail import EmailMultiAlternatives
from django.core.validators import validate_email
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.http import JsonResponse
from django.utils.html import escape
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from .models import ContactMessage, Project, ProjectImage, ProjectParagraph, SiteSettings
from .templatetags.media_extras import cld, cld_srcset

log = logging.getLogger(__name__)

PROJECTS_CACHE_KEY = "api:projects:v1"
EDGE_CACHE = "public, max-age=60, s-maxage=300, stale-while-revalidate=604800"


# ───────────────────────── helpers ─────────────────────────
def _pick(en, ar):
    """Prefer the English copy, fall back to Arabic."""
    return (en or "").strip() or (ar or "").strip()


def _split_tech(raw):
    return [t.strip() for t in re.split(r"[,،|/·\n]+", raw or "") if t.strip()]


def _image(url):
    if not url:
        return None
    return {
        "src": cld(url, "f_auto,q_auto,w_900"),
        "thumb": cld(url, "f_auto,q_auto,w_480"),
        "full": cld(url, "f_auto,q_auto,w_1920"),
        "srcset": cld_srcset(url, "480,800,1200,1600"),
    }


def _safe_url(field):
    try:
        return field.url if field else ""
    except Exception:  # storage misconfigured → don't break the whole API
        log.exception("Could not build image URL")
        return ""


def serialize_project(p):
    images = [img for img in (_image(_safe_url(i.image)) for i in p.images.all()) if img]
    paragraphs = [
        _pick(par.text_en, par.text) for par in p.paragraphs.all() if (par.text or par.text_en)
    ]
    return {
        "id": p.pk,
        "title": _pick(p.title_en, p.title),
        "title_ar": p.title,
        "summary": _pick(p.description_en, p.description),
        "problem": _pick(p.problem_en, p.problem),
        "solution": _pick(p.solution_en, p.solution),
        "outcome": _pick(p.outcome_en, p.outcome),
        "paragraphs": paragraphs,
        "tech": _split_tech(p.technologies),
        "live_url": p.live_url,
        "github_url": p.github_url,
        "year": p.created_at.year if p.created_at else None,
        "cover": images[0] if images else None,
        "images": images,
    }


def hero_payload(settings_obj=None):
    """Custom profile photo (or None → the frontend uses its built-in photo)."""
    try:
        obj = settings_obj or SiteSettings.objects.filter(pk=1).first()
    except Exception:  # table not migrated yet → keep the site working
        log.warning("SiteSettings table missing — run `python manage.py migrate`")
        return None
    url = _safe_url(obj.hero_image) if obj and obj.hero_image else ""
    if not url:
        return None
    return {
        "src": cld(url, "f_auto,q_auto,w_720"),
        "srcset": cld_srcset(url, "480,720,960"),
        "full": cld(url, "f_auto,q_auto,w_1400"),
        "updated_at": obj.updated_at.isoformat() if obj.updated_at else None,
    }


def _projects_payload():
    payload = cache.get(PROJECTS_CACHE_KEY)
    if payload is None:
        qs = (
            Project.objects.filter(is_published=True)
            .prefetch_related("images", "paragraphs")
            .order_by("order", "-created_at")
        )
        projects = [serialize_project(p) for p in qs]
        payload = {"count": len(projects), "projects": projects, "site": {"hero": hero_payload()}}
        cache.set(PROJECTS_CACHE_KEY, payload, settings.API_CACHE_SECONDS)
    return payload


@receiver([post_save, post_delete], sender=Project)
@receiver([post_save, post_delete], sender=ProjectImage)
@receiver([post_save, post_delete], sender=ProjectParagraph)
@receiver([post_save, post_delete], sender=SiteSettings)
def _bust_cache(**_kwargs):
    cache.delete(PROJECTS_CACHE_KEY)


def _json(data, status=200, cacheable=False):
    resp = JsonResponse(data, status=status, json_dumps_params={"ensure_ascii": False})
    resp["Cache-Control"] = EDGE_CACHE if cacheable else "no-store"
    return resp


# ───────────────────────── endpoints ─────────────────────────
@require_GET
def index(_request):
    return _json({
        "endpoints": {
            "projects": "/api/projects/",
            "project": "/api/projects/<id>/",
            "contact": "POST /api/contact/",
            "health": "/api/health/",
        }
    })


@require_GET
def health(_request):
    return _json({"ok": True})


@require_GET
def projects(_request):
    return _json(_projects_payload(), cacheable=True)


@require_GET
def project_detail(_request, pk):
    pk = int(pk)
    for p in _projects_payload()["projects"]:
        if p["id"] == pk:
            return _json(p, cacheable=True)
    return _json({"error": "Project not found"}, status=404)


# ───────────────────────── contact ─────────────────────────
RATE_LIMIT = 5          # messages …
RATE_WINDOW = 60 * 10   # … per 10 minutes per IP


def _client_ip(request):
    fwd = request.META.get("HTTP_X_FORWARDED_FOR", "")
    return fwd.split(",")[0].strip() if fwd else request.META.get("REMOTE_ADDR", "")


def _notify(msg):
    """Email the owner. SMTP (Gmail) first, Resend as a fallback."""
    subject = f"New portfolio message — {msg.name}: {msg.subject or 'No subject'}"
    text = (
        f"Name: {msg.name}\nEmail: {msg.email}\nPhone: {msg.phone or '-'}\n"
        f"Subject: {msg.subject or '-'}\n\n{msg.message}"
    )
    html = f"""
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #1f2440;border-radius:16px;overflow:hidden;background:#05060d;color:#e8ebff">
      <div style="background:linear-gradient(90deg,#22d3ee,#6366f1,#d946ef);padding:18px 24px">
        <h2 style="margin:0;color:#05060d;font-size:18px">New message from your portfolio</h2>
      </div>
      <div style="padding:24px;line-height:1.7">
        <p><b>Name:</b> {escape(msg.name)}</p>
        <p><b>Email:</b> <a style="color:#22d3ee" href="mailto:{escape(msg.email)}">{escape(msg.email)}</a></p>
        <p><b>Phone:</b> {escape(msg.phone or '-')}</p>
        <p><b>Subject:</b> {escape(msg.subject or '-')}</p>
        <div style="margin-top:16px;background:#0d1024;padding:16px;border-radius:10px;border-left:4px solid #6366f1;white-space:pre-wrap">{escape(msg.message)}</div>
      </div>
    </div>"""

    if settings.EMAIL_HOST_PASSWORD:
        try:
            mail = EmailMultiAlternatives(
                subject=subject,
                body=text,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[settings.CONTACT_RECEIVER],
                reply_to=[msg.email],
            )
            mail.attach_alternative(html, "text/html")
            mail.send()
            return True
        except Exception:
            log.exception("SMTP notification failed")

    if settings.RESEND_API_KEY:
        try:
            req = urllib.request.Request(
                "https://api.resend.com/emails",
                data=json.dumps({
                    "from": settings.RESEND_FROM,
                    "to": [settings.CONTACT_RECEIVER],
                    "reply_to": msg.email,
                    "subject": subject,
                    "html": html,
                    "text": text,
                }).encode(),
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=8) as r:
                return 200 <= r.status < 300
        except Exception:
            log.exception("Resend notification failed")
    return False


@csrf_exempt
@require_http_methods(["POST"])
def contact(request):
    try:
        data = json.loads(request.body or b"{}") if request.content_type == "application/json" else request.POST
    except (ValueError, UnicodeDecodeError):
        return _json({"ok": False, "error": "Invalid request."}, status=400)

    get = lambda k: str(data.get(k, "") or "").strip()  # noqa: E731

    # Honeypot — bots fill hidden fields; pretend success.
    if get("website"):
        return _json({"ok": True})

    name, email, phone = get("name"), get("email"), get("phone")
    subject, message = get("subject"), get("message")

    errors = {}
    if not 2 <= len(name) <= 150:
        errors["name"] = "Please enter your name."
    try:
        validate_email(email)
    except ValidationError:
        errors["email"] = "Please enter a valid email."
    if phone and not re.fullmatch(r"[+\d\s()-]{6,20}", phone):
        errors["phone"] = "Please enter a valid phone number."
    if len(subject) > 250:
        errors["subject"] = "Subject is too long."
    if not 10 <= len(message) <= 5000:
        errors["message"] = "Message should be between 10 and 5000 characters."
    if errors:
        return _json({"ok": False, "errors": errors}, status=400)

    key = f"contact-rate:{_client_ip(request)}"
    hits = cache.get(key, 0)
    if hits >= RATE_LIMIT:
        return _json({"ok": False, "error": "Too many messages — please try again later."}, status=429)
    cache.set(key, hits + 1, RATE_WINDOW)

    msg = ContactMessage.objects.create(
        name=name, email=email, phone=phone or None, subject=subject or None, message=message
    )
    _notify(msg)  # message is saved even if email fails
    return _json({"ok": True})
