"""
Private JSON API for the React dashboard (/dashboard on the frontend).

Auth: staff users log in with their Django username/password and receive a
signed bearer token (no cookies → no CSRF issues through the Vercel rewrite).
The token is invalidated automatically when the user's password changes.
"""
import json
import logging
from datetime import datetime, time, timedelta
from functools import wraps

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.core import signing
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from django.db import transaction
from django.db.models import Count, F, Max, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.crypto import salted_hmac
from django.views.decorators.csrf import csrf_exempt

from .ai import ai_process
from .api import PROJECTS_CACHE_KEY, _client_ip, _image, _json, _safe_url, _split_tech
from .models import ContactMessage, Project, ProjectImage, ProjectParagraph

log = logging.getLogger(__name__)
User = get_user_model()

TOKEN_SALT = "jootech.dashboard.v1"
TOKEN_MAX_AGE = 60 * 60 * 24 * 7  # 7 days
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


# ───────────────────────── auth ─────────────────────────
def _pw_fingerprint(user):
    return salted_hmac("dashboard-token", user.password or "").hexdigest()[:16]


def make_token(user):
    return signing.dumps({"u": user.pk, "p": _pw_fingerprint(user)}, salt=TOKEN_SALT, compress=True)


def user_from_request(request):
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    try:
        data = signing.loads(header[7:].strip(), salt=TOKEN_SALT, max_age=TOKEN_MAX_AGE)
    except signing.BadSignature:  # includes SignatureExpired
        return None
    user = User.objects.filter(pk=data.get("u"), is_active=True, is_staff=True).first()
    if not user or data.get("p") != _pw_fingerprint(user):
        return None
    return user


def staff_required(view):
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        user = user_from_request(request)
        if not user:
            return _json({"error": "انتهت الجلسة — سجّل الدخول مرة أخرى."}, status=401)
        request.dash_user = user
        return view(request, *args, **kwargs)

    return csrf_exempt(wrapped)


def _body(request):
    try:
        return json.loads(request.body or b"{}")
    except (ValueError, UnicodeDecodeError):
        return None


def _method_not_allowed():
    return _json({"error": "طريقة غير مسموحة"}, status=405)


def _bust_public_cache():
    cache.delete(PROJECTS_CACHE_KEY)


def _user_payload(user):
    return {
        "username": user.get_username(),
        "name": user.get_full_name() or user.get_username(),
        "email": user.email,
        "is_superuser": user.is_superuser,
    }


@csrf_exempt
def login(request):
    if request.method != "POST":
        return _method_not_allowed()
    key = f"dash-login:{_client_ip(request)}"
    attempts = cache.get(key, 0)
    if attempts >= 10:
        return _json({"error": "محاولات كثيرة — استنى ربع ساعة وحاول تاني."}, status=429)

    data = _body(request) or {}
    user = authenticate(
        request,
        username=str(data.get("username", "")).strip(),
        password=str(data.get("password", "")),
    )
    if not user or not user.is_active or not user.is_staff:
        cache.set(key, attempts + 1, 60 * 15)
        return _json({"error": "اسم المستخدم أو كلمة المرور غير صحيحة."}, status=400)

    cache.delete(key)
    return _json({"token": make_token(user), "user": _user_payload(user)})


@staff_required
def me(request):
    return _json({"user": _user_payload(request.dash_user)})


# ───────────────────────── serializers ─────────────────────────
TEXT_FIELDS = (
    "title", "title_en", "description", "description_en",
    "problem", "problem_en", "solution", "solution_en", "outcome", "outcome_en",
)


def _img_payload(img):
    data = _image(_safe_url(img.image)) or {}
    return {"id": img.pk, "order": img.order, **data}


def admin_project(p):
    images = [_img_payload(i) for i in p.images.all()]
    return {
        "id": p.pk,
        **{f: getattr(p, f) or "" for f in TEXT_FIELDS},
        "technologies": p.technologies or "",
        "tech": _split_tech(p.technologies),
        "live_url": p.live_url or "",
        "github_url": p.github_url or "",
        "is_published": p.is_published,
        "order": p.order,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "images": images,
        "cover": images[0] if images else None,
        "paragraphs": [
            {"id": par.pk, "text": par.text or "", "text_en": par.text_en or ""} for par in p.paragraphs.all()
        ],
    }


def _message_payload(m):
    return {
        "id": m.pk,
        "name": m.name,
        "email": m.email,
        "phone": m.phone or "",
        "subject": m.subject or "",
        "message": m.message,
        "is_read": m.is_read,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


def _projects_qs():
    return Project.objects.prefetch_related("images", "paragraphs").order_by("order", "-created_at")


# ───────────────────────── validation ─────────────────────────
_url = URLValidator(schemes=["http", "https"])


def _apply_project_data(p, data):
    """Copy allowed fields from `data` onto project `p`. Returns an errors dict."""
    errors = {}
    for f in TEXT_FIELDS:
        if f in data:
            setattr(p, f, str(data.get(f) or "").strip())

    if "tech" in data and isinstance(data["tech"], list):
        p.technologies = ", ".join(str(t).strip() for t in data["tech"] if str(t).strip())
    elif "technologies" in data:
        p.technologies = str(data.get("technologies") or "").strip()

    for f in ("live_url", "github_url"):
        if f in data:
            val = str(data.get(f) or "").strip()
            if val:
                try:
                    _url(val)
                except ValidationError:
                    errors[f] = "الرابط غير صالح (لازم يبدأ بـ http أو https)."
            setattr(p, f, val)

    if "is_published" in data:
        p.is_published = bool(data["is_published"])

    if not (p.title or "").strip():
        errors["title"] = "العنوان مطلوب."
    elif len(p.title) > 200:
        errors["title"] = "العنوان أطول من 200 حرف."
    if len(p.title_en or "") > 200:
        errors["title_en"] = "العنوان أطول من 200 حرف."
    if not (p.description or "").strip():
        errors["description"] = "الوصف المختصر مطلوب."
    if len(p.technologies or "") > 200:
        errors["technologies"] = "التقنيات أطول من 200 حرف."
    return errors


def _save_paragraphs(p, paragraphs):
    if not isinstance(paragraphs, list):
        return
    p.paragraphs.all().delete()
    rows = []
    for i, item in enumerate(paragraphs):
        if not isinstance(item, dict):
            continue
        text = str(item.get("text") or "").strip()
        text_en = str(item.get("text_en") or "").strip()
        if text or text_en:
            rows.append(ProjectParagraph(project=p, text=text or text_en, text_en=text_en, order=i))
    ProjectParagraph.objects.bulk_create(rows)


# ───────────────────────── stats ─────────────────────────
@staff_required
def stats(request):
    now = timezone.now()
    today = timezone.localdate()
    start = today - timedelta(days=29)
    start_dt = timezone.make_aware(datetime.combine(start, time.min))

    counts = {
        row["d"]: row["c"]
        for row in ContactMessage.objects.filter(created_at__gte=start_dt)
        .annotate(d=TruncDate("created_at"))
        .order_by()
        .values("d")
        .annotate(c=Count("id"))
    }
    daily = [{"date": (start + timedelta(days=i)).isoformat(), "count": counts.get(start + timedelta(days=i), 0)} for i in range(30)]

    projects = Project.objects.aggregate(
        total=Count("id"),
        published=Count("id", filter=Q(is_published=True)),
    )
    messages = ContactMessage.objects.aggregate(
        total=Count("id"),
        unread=Count("id", filter=Q(is_read=False)),
        last30=Count("id", filter=Q(created_at__gte=now - timedelta(days=30))),
        prev30=Count("id", filter=Q(created_at__gte=now - timedelta(days=60), created_at__lt=now - timedelta(days=30))),
    )
    return _json({
        "projects": {
            "total": projects["total"],
            "published": projects["published"],
            "drafts": projects["total"] - projects["published"],
            "images": ProjectImage.objects.count(),
        },
        "messages": messages,
        "daily": daily,
        "latest_messages": [_message_payload(m) for m in ContactMessage.objects.order_by("-created_at")[:5]],
        "recent_projects": [admin_project(p) for p in _projects_qs()[:4]],
    })


# ───────────────────────── projects ─────────────────────────
@staff_required
def projects(request):
    if request.method == "GET":
        return _json({"projects": [admin_project(p) for p in _projects_qs()]})

    if request.method == "POST":
        data = _body(request)
        if data is None:
            return _json({"error": "بيانات غير صالحة"}, status=400)
        p = Project()
        errors = _apply_project_data(p, data)
        if errors:
            return _json({"errors": errors}, status=400)
        with transaction.atomic():
            # new projects go to the top of the list
            Project.objects.update(order=F("order") + 1)
            p.order = 0
            p.save()
            _save_paragraphs(p, data.get("paragraphs", []))
        _bust_public_cache()
        return _json({"project": admin_project(_projects_qs().get(pk=p.pk))}, status=201)

    return _method_not_allowed()


@staff_required
def project_detail(request, pk):
    p = _projects_qs().filter(pk=int(pk)).first()
    if not p:
        return _json({"error": "المشروع غير موجود"}, status=404)

    if request.method == "GET":
        return _json({"project": admin_project(p)})

    if request.method in ("PATCH", "PUT"):
        data = _body(request)
        if data is None:
            return _json({"error": "بيانات غير صالحة"}, status=400)
        errors = _apply_project_data(p, data)
        if errors:
            return _json({"errors": errors}, status=400)
        with transaction.atomic():
            p.save()
            if "paragraphs" in data:
                _save_paragraphs(p, data["paragraphs"])
        _bust_public_cache()
        return _json({"project": admin_project(_projects_qs().get(pk=p.pk))})

    if request.method == "DELETE":
        for img in p.images.all():
            try:
                img.image.delete(save=False)
            except Exception:
                log.warning("Could not delete image file %s", img.pk)
        p.delete()
        _bust_public_cache()
        return _json({"ok": True})

    return _method_not_allowed()


@staff_required
def projects_reorder(request):
    if request.method != "POST":
        return _method_not_allowed()
    data = _body(request) or {}
    ids = [int(i) for i in data.get("ids", []) if str(i).isdigit()]
    with transaction.atomic():
        for idx, pid in enumerate(ids):
            Project.objects.filter(pk=pid).update(order=idx)
    _bust_public_cache()
    return _json({"ok": True})


# ───────────────────────── images ─────────────────────────
@staff_required
def project_images(request, pk):
    p = Project.objects.filter(pk=int(pk)).first()
    if not p:
        return _json({"error": "المشروع غير موجود"}, status=404)
    if request.method != "POST":
        return _method_not_allowed()

    files = request.FILES.getlist("images")
    if not files:
        return _json({"error": "مفيش صور مرفوعة."}, status=400)

    start = (p.images.aggregate(m=Max("order"))["m"] or 0) + 1
    created, errors = [], []
    for i, f in enumerate(files):
        if not (getattr(f, "content_type", "") or "").startswith("image/"):
            errors.append(f"{f.name}: ليس ملف صورة")
            continue
        if f.size > MAX_UPLOAD_BYTES:
            errors.append(f"{f.name}: الحجم أكبر من 10MB")
            continue
        try:
            img = ProjectImage.objects.create(project=p, image=f, order=start + i)
            created.append(_img_payload(img))
        except Exception:
            log.exception("Image upload failed")
            errors.append(f"{f.name}: فشل الرفع — تأكد من إعدادات Cloudinary")
    _bust_public_cache()
    status = 201 if created else 400
    return _json({"images": created, "errors": errors}, status=status)


@staff_required
def project_images_reorder(request, pk):
    if request.method != "POST":
        return _method_not_allowed()
    data = _body(request) or {}
    ids = [int(i) for i in data.get("ids", []) if str(i).isdigit()]
    with transaction.atomic():
        for idx, iid in enumerate(ids):
            ProjectImage.objects.filter(pk=iid, project_id=int(pk)).update(order=idx)
    _bust_public_cache()
    return _json({"ok": True})


@staff_required
def image_detail(request, pk):
    img = ProjectImage.objects.filter(pk=int(pk)).first()
    if not img:
        return _json({"error": "الصورة غير موجودة"}, status=404)
    if request.method != "DELETE":
        return _method_not_allowed()
    try:
        img.image.delete(save=False)
    except Exception:
        log.warning("Could not delete image file %s", img.pk)
    img.delete()
    _bust_public_cache()
    return _json({"ok": True})


# ───────────────────────── messages ─────────────────────────
PAGE_SIZE = 20


@staff_required
def messages(request):
    if request.method != "GET":
        return _method_not_allowed()
    qs = ContactMessage.objects.order_by("-created_at")
    status = request.GET.get("status", "all")
    if status == "unread":
        qs = qs.filter(is_read=False)
    elif status == "read":
        qs = qs.filter(is_read=True)
    q = request.GET.get("q", "").strip()
    if q:
        qs = qs.filter(Q(name__icontains=q) | Q(email__icontains=q) | Q(subject__icontains=q) | Q(message__icontains=q))

    total = qs.count()
    try:
        page = max(1, int(request.GET.get("page", 1)))
    except ValueError:
        page = 1
    pages = max(1, (total + PAGE_SIZE - 1) // PAGE_SIZE)
    page = min(page, pages)
    rows = qs[(page - 1) * PAGE_SIZE : page * PAGE_SIZE]
    return _json({
        "results": [_message_payload(m) for m in rows],
        "count": total,
        "page": page,
        "pages": pages,
        "unread": ContactMessage.objects.filter(is_read=False).count(),
    })


@staff_required
def message_detail(request, pk):
    m = ContactMessage.objects.filter(pk=int(pk)).first()
    if not m:
        return _json({"error": "الرسالة غير موجودة"}, status=404)
    if request.method == "GET":
        return _json({"message": _message_payload(m)})
    if request.method in ("PATCH", "PUT"):
        data = _body(request) or {}
        if "is_read" in data:
            m.is_read = bool(data["is_read"])
            m.save(update_fields=["is_read"])
        return _json({"message": _message_payload(m)})
    if request.method == "DELETE":
        m.delete()
        return _json({"ok": True})
    return _method_not_allowed()


@staff_required
def messages_read_all(request):
    if request.method != "POST":
        return _method_not_allowed()
    n = ContactMessage.objects.filter(is_read=False).update(is_read=True)
    return _json({"ok": True, "updated": n})


# ───────────────────────── AI helper ─────────────────────────
@staff_required
def ai(request):
    if request.method != "POST":
        return _method_not_allowed()
    data = _body(request) or {}
    result, error = ai_process(data.get("mode", ""), data.get("text", ""))
    if error:
        return _json({"error": error}, status=400)
    return _json({"result": result})
