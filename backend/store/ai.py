"""
مساعد الذكاء الاصطناعي للوحة الأدمن:
- تحسين صياغة النصوص العربية (أوصاف المشاريع)
- ترجمة النصوص من العربية للإنجليزية

يدعم مزوّدين — يكفي ضبط أي واحد منهما:
1. Google Gemini (مجاني):  مفتاح من aistudio.google.com → متغير البيئة GEMINI_API_KEY
2. Anthropic Claude (مدفوع): مفتاح من console.anthropic.com → متغير البيئة ANTHROPIC_API_KEY
"""
import json
import urllib.request
import urllib.error

from django.conf import settings

GEMINI_MODEL = "gemini-flash-latest"
ANTHROPIC_MODEL = "claude-haiku-4-5"

PROMPTS = {
    "improve": (
        "أنت محرر محتوى محترف لمواقع البورتفوليو. سيعطيك المستخدم وصفاً لمشروع برمجي "
        "مكتوباً بالعربية. حسّن صياغته: اجعله أوضح وأكثر احترافية وجاذبية للعملاء، "
        "صحّح الأخطاء الإملائية والنحوية، وحافظ على كل المعلومات والحقائق الموجودة "
        "بدون إضافة معلومات أو مزايا لم يذكرها المستخدم، وبدون مبالغة تسويقية زائدة. "
        "حافظ على طول مقارب للنص الأصلي. "
        "أجب بالنص المحسّن فقط بدون أي مقدمات أو تعليقات أو علامات تنصيص."
    ),
    "translate": (
        "You are a professional Arabic-to-English translator for a software developer's "
        "portfolio website. Translate the user's Arabic text into natural, professional "
        "English suitable for international clients. Keep all facts exactly as stated. "
        "Reply with the translation only — no introductions, comments, or quotation marks."
    ),
}

NO_KEY_MSG = (
    "لا يوجد مفتاح ذكاء اصطناعي مضبوط. الحل المجاني: "
    "احصل على مفتاح من aistudio.google.com وضعه في متغير البيئة GEMINI_API_KEY. "
    "(أو مفتاح Anthropic المدفوع في ANTHROPIC_API_KEY)"
)


def _http_json(url, payload, headers):
    """طلب POST بجسم JSON — يرجع (dict, error_message)."""
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", **headers},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            return json.loads(resp.read().decode("utf-8")), None
    except urllib.error.HTTPError as e:
        try:
            detail = json.loads(e.read().decode("utf-8")).get("error", {})
            detail = detail.get("message", "") if isinstance(detail, dict) else ""
        except Exception:
            detail = ""
        if e.code in (401, 403):
            return None, "مفتاح API غير صحيح أو غير مفعّل — راجع المفتاح."
        if e.code == 429:
            return None, "تم تجاوز الحد المجاني مؤقتاً — استنى دقيقة وجرّب تاني."
        return None, f"خطأ من خدمة الذكاء الاصطناعي ({e.code}): {detail or 'حاول مرة أخرى'}"
    except Exception:
        return None, "تعذر الاتصال بخدمة الذكاء الاصطناعي — تأكد من اتصال السيرفر بالإنترنت."


def _call_gemini(api_key, system_prompt, text):
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL}:generateContent?key={api_key}"
    )
    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": text}]}],
    }
    data, err = _http_json(url, payload, {})
    if err:
        return None, err
    try:
        parts = data["candidates"][0]["content"]["parts"]
        result = "".join(p.get("text", "") for p in parts).strip()
    except Exception:
        result = ""
    return (result, None) if result else (None, "لم يصل رد صالح — حاول مرة أخرى.")


def _call_anthropic(api_key, system_prompt, text):
    payload = {
        "model": ANTHROPIC_MODEL,
        "max_tokens": 2000,
        "system": system_prompt,
        "messages": [{"role": "user", "content": text}],
    }
    headers = {"x-api-key": api_key, "anthropic-version": "2023-06-01"}
    data, err = _http_json("https://api.anthropic.com/v1/messages", payload, headers)
    if err:
        return None, err
    try:
        result = "".join(
            b.get("text", "") for b in data.get("content", []) if b.get("type") == "text"
        ).strip()
    except Exception:
        result = ""
    return (result, None) if result else (None, "لم يصل رد صالح — حاول مرة أخرى.")


def ai_process(mode, text):
    """
    ينفذ العملية المطلوبة ويرجع (result, error).
    عند النجاح: (النص الناتج, None) — عند الفشل: (None, رسالة الخطأ بالعربية).
    """
    text = (text or "").strip()
    if not text:
        return None, "الخانة فارغة — اكتب النص الأول ثم اضغط الزرار."
    if mode not in PROMPTS:
        return None, "عملية غير معروفة."
    if len(text) > 8000:
        return None, "النص أطول من اللازم (الحد 8000 حرف)."

    system_prompt = PROMPTS[mode]
    gemini_key = getattr(settings, "GEMINI_API_KEY", "")
    anthropic_key = getattr(settings, "AI_API_KEY", "")

    if gemini_key:
        return _call_gemini(gemini_key, system_prompt, text)
    if anthropic_key:
        return _call_anthropic(anthropic_key, system_prompt, text)
    return None, NO_KEY_MSG
