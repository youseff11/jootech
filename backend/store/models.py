from django.db import models
from django.core.files.base import ContentFile
from io import BytesIO
from PIL import Image, ImageOps
import os

# ============ إعدادات ضغط الصور التلقائي ============
IMG_MAX_DIMENSION = 1920   # أقصى عرض/ارتفاع للصورة (كافي جداً لأي شاشة)
IMG_WEBP_QUALITY = 82      # جودة الضغط (82 = جودة ممتازة بالعين مع حجم صغير)


def compress_image_to_webp(django_file, max_dim=IMG_MAX_DIMENSION, quality=IMG_WEBP_QUALITY):
    """
    يحوّل أي صورة (PNG / JPG / ...) إلى WebP مضغوطة ويصغّر أبعادها لو أكبر من الحد.
    يرجع ContentFile جاهز للحفظ، أو None لو الصورة لا يجب ضغطها (مثل GIF المتحرك).
    """
    django_file.seek(0)
    img = Image.open(django_file)
    if (img.format or '').upper() == 'GIF':
        return None  # نسيب الصور المتحركة كما هي

    # تصحيح اتجاه الصورة حسب بيانات الكاميرا (EXIF)
    img = ImageOps.exif_transpose(img)

    # تحويل الأنماط غير المدعومة مع الحفاظ على الشفافية إن وُجدت
    if img.mode == 'P':
        img = img.convert('RGBA' if 'transparency' in img.info else 'RGB')
    elif img.mode == 'CMYK':
        img = img.convert('RGB')

    # تصغير الأبعاد لو أكبر من الحد (مع الحفاظ على النسبة)
    if max(img.size) > max_dim:
        img.thumbnail((max_dim, max_dim), Image.LANCZOS)

    buf = BytesIO()
    img.save(buf, format='WEBP', quality=quality, method=6)
    buf.seek(0)
    return ContentFile(buf.read())


class Project(models.Model):
    title = models.CharField(max_length=200, verbose_name="عنوان المشروع")
    description = models.TextField(verbose_name="وصف المشروع (مختصر)")
    problem = models.TextField(blank=True, default='', verbose_name="المشكلة التي يحلها المشروع")
    solution = models.TextField(blank=True, default='', verbose_name="الحل الذي تم تنفيذه")
    outcome = models.TextField(blank=True, default='', verbose_name="القيمة أو النتيجة")
    technologies = models.CharField(max_length=200, blank=True, verbose_name="التقنيات المستخدمة (مثل: Django, HTML)")
    live_url = models.URLField(blank=True, verbose_name="رابط المشروع الحي (Live)")
    github_url = models.URLField(blank=True, verbose_name="رابط الكود (GitHub - إن وجد)")
    is_published = models.BooleanField(default=True, verbose_name="نشر المشروع؟ (إلغاء التحديد سيخفيه من الموقع)")
    order = models.PositiveIntegerField(default=0, verbose_name="ترتيب العرض (الأصغر يظهر أولاً)", help_text="اكتب رقم لترتيب المشروع. المشروع ذو الرقم الأصغر يظهر أولاً.")
    title_en = models.CharField(max_length=200, blank=True, verbose_name="عنوان المشروع (إنجليزي)")
    description_en = models.TextField(blank=True, verbose_name="وصف المشروع بالإنجليزي (مختصر)")
    problem_en = models.TextField(blank=True, default='', verbose_name="المشكلة (إنجليزي)")
    solution_en = models.TextField(blank=True, default='', verbose_name="الحل (إنجليزي)")
    outcome_en = models.TextField(blank=True, default='', verbose_name="القيمة أو النتيجة (إنجليزي)")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الإضافة")

    class Meta:
        ordering = ['order', '-created_at']
        verbose_name = "مشروع"
        verbose_name_plural = "المشاريع"

    def __str__(self):
        return self.title

# مودل جديد لفقرات المشروع (عشان تزود تيكست بوكس براحتك)
class ProjectParagraph(models.Model):
    project = models.ForeignKey(Project, related_name='paragraphs', on_delete=models.CASCADE)
    text = models.TextField(verbose_name="محتوى الفقرة")
    text_en = models.TextField(blank=True, verbose_name="محتوى الفقرة (إنجليزي)")
    order = models.PositiveIntegerField(default=0, verbose_name="الترتيب (اختياري)", blank=True, null=True)

    class Meta:
        ordering = ['order', 'id']
        verbose_name = "فقرة المشروع"
        verbose_name_plural = "فقرات المشروع"

    def __str__(self):
        return f"فقرة تابعة لـ: {self.project.title}"

class ProjectImage(models.Model):
    project = models.ForeignKey(Project, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='portfolio_images/')
    order = models.PositiveIntegerField(default=0, verbose_name="ترتيب الصورة", help_text="اكتب رقم لترتيب الصورة. الصورة ذات الرقم الأصغر تظهر أولاً.")

    def save(self, *args, **kwargs):
        # PERF: ضغط تلقائي لأي صورة جديدة تُرفع من لوحة الأدمن — تتحول لـ WebP مضغوطة
        # قبل حفظها على السيرفر. لو الضغط لن يوفّر حجماً (صورة صغيرة/مضغوطة أصلاً)
        # أو حصل أي خطأ، تُحفظ الصورة الأصلية كما هي بدون مشاكل.
        try:
            if self.image and not self.image.name.lower().endswith('.webp'):
                original_size = getattr(self.image, 'size', None)
                compressed = compress_image_to_webp(self.image)
                if compressed is not None and (original_size is None or compressed.size < original_size):
                    base_name = os.path.splitext(os.path.basename(self.image.name))[0]
                    self.image.save(base_name + '.webp', compressed, save=False)
        except Exception:
            pass
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['order', 'id']
        verbose_name = "صورة المشروع"
        verbose_name_plural = "صور المشروع"

class ContactMessage(models.Model):
    name = models.CharField(max_length=150, verbose_name="اسم المرسل")
    email = models.EmailField(verbose_name="البريد الإلكتروني")
    phone = models.CharField(max_length=20, verbose_name="رقم الهاتف", blank=True, null=True)
    subject = models.CharField(max_length=250, blank=True, null=True, verbose_name="الموضوع")
    message = models.TextField(verbose_name="محتوى الرسالة")
    is_read = models.BooleanField(default=False, verbose_name="تمت القراءة؟")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الإرسال")

    class Meta:
        ordering = ['-created_at']
        verbose_name = "رسالة تواصل"
        verbose_name_plural = "رسائل التواصل"

    def __str__(self):
        return f"رسالة من: {self.name} - {self.subject if self.subject else 'بدون موضوع'}"