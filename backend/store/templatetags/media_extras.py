"""
فلاتر تحسين الصور — تحوّل روابط Cloudinary لصيغة مضغوطة ومقاس مناسب.

قبل:  .../image/upload/v1/media/portfolio_images/xxx        -> 181 KB (1919x930)
بعد:  .../image/upload/f_auto,q_auto,w_700/v1/media/...     ->  32 KB

f_auto = يبعت WebP/AVIF حسب المتصفح
q_auto = ضغط ذكي حسب محتوى الصورة
w_###  = المقاس المطلوب فعلاً بدل المقاس الأصلي
"""
from django import template

register = template.Library()

_MARKER = "/image/upload/"
DEFAULT_TRANSFORM = "f_auto,q_auto,w_700"


@register.filter(name="cld")
def cld(url, transform=DEFAULT_TRANSFORM):
    """يضيف transformations لرابط Cloudinary. أي رابط تاني بيرجع زي ما هو."""
    if not url:
        return url
    url = str(url)
    if _MARKER not in url:
        return url

    head, _, tail = url.partition(_MARKER)

    # لو فيه transformation متطبّق قبل كده، ما نكررهاش
    first_segment = tail.split("/", 1)[0]
    if any(first_segment.startswith(p) for p in ("f_", "q_", "w_", "h_", "c_", "dpr_")):
        return url

    return f"{head}{_MARKER}{transform}/{tail}"


@register.filter(name="cld_srcset")
def cld_srcset(url, widths="500,800,1200"):
    """يبني srcset بمقاسات متعددة عشان المتصفح يختار الأنسب للشاشة."""
    if not url:
        return ""
    url = str(url)
    if _MARKER not in url:
        return ""

    parts = []
    for raw in widths.split(","):
        w = raw.strip()
        if not w.isdigit():
            continue
        parts.append(f"{cld(url, f'f_auto,q_auto,w_{w}')} {w}w")
    return ", ".join(parts)
