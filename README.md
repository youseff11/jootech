# JooTech Portfolio — React + Django

```
protfolio 2/
├── backend/    Django API + لوحة الأدمن (Neon + Cloudinary)
└── frontend/   React (Vite) — الواجهة
```

الباك إند بيستخدم **نفس جداول البروتفوليو القديم** (`store_project` …) ونفس الـ migrations،
فالمشاريع والصور اللي في Neon و Cloudinary بتظهر مباشرة من غير أي نقل بيانات.

---

## 1) تشغيل الباك إند محلياً

```bash
cd backend
python -m venv venv
venv\Scripts\activate            # على ويندوز
pip install -r requirements.txt
python manage.py migrate         # مش هيعمل حاجة على Neon لأن الجداول موجودة
python manage.py runserver
```

- API: http://127.0.0.1:8000/api/projects/
- الأدمن: http://127.0.0.1:8000/admin/ (نفس يوزر الأدمن القديم)

> ⚠ لازم تحط `CLOUDINARY_API_SECRET` في `backend/.env` — من غيره الصور هتظهر عادي
> لكن رفع صور جديدة من الأدمن هيفشل.

## 2) تشغيل الفرونت إند محلياً

```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173
```

الـ Vite بيحوّل أي طلب `/api` للباك إند على بورت 8000 تلقائياً.

---

## 3) الرفع على Vercel (مشروعين من نفس الريبو)

**الباك إند**
1. New Project → اختار الريبو → **Root Directory = `backend`**.
2. Environment Variables: انسخ كل اللي في `backend/.env` مع:
   - `DEBUG=False`
   - `CLOUDINARY_API_SECRET=...`
3. Deploy → هتاخد رابط زي `https://jootech-api.vercel.app`.

**الفرونت إند**
1. New Project → نفس الريبو → **Root Directory = `frontend`** (Framework: Vite).
2. افتح `frontend/vercel.json` وغيّر `https://jootech-api.vercel.app` لرابط الباك إند بتاعك.
3. Deploy.

الـ `/api` بيعدّي من دومين الفرونت نفسه (rewrite) — مفيش CORS، والـ Vercel CDN بيعمل
cache لقائمة المشاريع، فالموقع بيفتح بسرعة جداً. أي تعديل من الأدمن بيظهر خلال ~5 دقايق.

---

## تعديل المحتوى

| عايز تغيّر | الملف |
|---|---|
| الاسم، النبذة، الإيميل، اللينكات، الخدمات، خطوات الشغل | `frontend/src/data/site.js` |
| الصورة الشخصية | `frontend/src/assets/hero.webp` + `hero.avif` |
| الألوان والخطوط | أول جزء في `frontend/src/styles.css` (`:root`) |
| المشاريع | لوحة الأدمن `/admin` |

- المشاريع بتتعرض بالنسخة الإنجليزية (`title_en` …) ولو فاضية بتتعرض العربي.
- خانة **التقنيات** في الأدمن (مفصولة بفاصلة: `Django, React, PostgreSQL`) بتظهر كـ tags
  وبتعمل فلاتر فوق المشاريع تلقائياً.
- أول مشروع في الترتيب بيتعرض كبير (featured).

## الـ API

| Method | Endpoint | |
|---|---|---|
| GET | `/api/projects/` | كل المشاريع المنشورة |
| GET | `/api/projects/<id>/` | مشروع واحد |
| POST | `/api/contact/` | فورم التواصل (بيتسجل في الأدمن + إيميل) |
| GET | `/api/health/` | فحص |

---

## لوحة التحكم `/dashboard`

لوحة تحكم خاصة بيك (عربي RTL، شغالة على الموبايل والكمبيوتر) بدل أدمن Django:

- **الرئيسية:** إحصائيات المشاريع والصور والرسائل + رسم بياني لرسائل آخر 30 يوم + أحدث الرسائل.
- **المشاريع:** إضافة / تعديل / حذف، نشر وإخفاء بزرار، ترتيب بالسحب (أو بالأسهم على الموبايل)،
  محرر بتابين عربي/English، فقرات التنفيذ، التقنيات كـ tags، رفع صور متعددة بالسحب مع ضغط تلقائي لـ WebP وترتيبها وحذفها.
- **مساعد AI (Gemini):** "حسّن الصياغة" للعربي، و"ترجم من العربي" أو "ترجم الفاضي كله" للإنجليزي.
- **الرسائل:** صندوق وارد، بحث، فلترة مقروء/غير مقروء، رد بالإيميل أو واتساب، حذف.

**الدخول:** بنفس يوزر الأدمن بتاع Django (لازم يكون staff). لو محتاج يوزر جديد:
```bash
cd backend
python manage.py createsuperuser
```

- الـ dashboard بتتحمّل كـ chunk منفصل، فزوار الموقع مش بيحمّلوها خالص.
- الجلسة بتفضل 7 أيام، وبتتقفل تلقائياً لو غيّرت الباسورد.
- التعديلات بتظهر على الموقع خلال ~5 دقايق (بسبب الـ cache على Vercel).
- `/admin` بتاع Django لسه موجود كاحتياطي.

## الأمان
- `.env` متضاف في `.gitignore` — متعملوش commit.
- بعد الربط غيّر كل المفاتيح (Neon, Gmail app password, Resend, Gemini) وحط الجديدة
  في `.env` وفي Vercel.
