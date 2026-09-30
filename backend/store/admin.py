from django.contrib import admin
from django import forms
from django.utils.html import format_html
from django.urls import path
from django.http import JsonResponse
import json

from adminsortable2.admin import SortableAdminMixin, SortableInlineAdminMixin

from .models import Project, ProjectParagraph, ProjectImage, ContactMessage
from .ai import ai_process


class MultiFileInput(forms.ClearableFileInput):
    allow_multiple_selected = True

    def __init__(self, attrs=None):
        super().__init__(attrs)
        if attrs is None:
            attrs = {}
        attrs['multiple'] = True
        self.attrs.update(attrs)


class MultiFileField(forms.FileField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("widget", MultiFileInput())
        super().__init__(*args, **kwargs)

    def clean(self, data, initial=None):
        single_file_clean = super().clean
        if isinstance(data, (list, tuple)):
            result = [single_file_clean(d, initial) for d in data]
        else:
            result = [single_file_clean(data, initial)]
        return result


class ProjectAdminForm(forms.ModelForm):
    upload_multiple_images = MultiFileField(
        label="📸 رفع عدة صور دفعة واحدة",
        required=False,
        help_text="اختر عدة صور مرة واحدة (اضغط Ctrl أو Shift لاختيار أكثر من صورة)"
    )

    class Meta:
        model = Project
        fields = '__all__'


class ProjectParagraphInline(admin.StackedInline):
    model = ProjectParagraph
    extra = 1
    fields = ('text', 'text_en', 'order')


class ProjectImageInline(SortableInlineAdminMixin, admin.TabularInline):
    model = ProjectImage
    extra = 0
    fields = ('preview_image', 'image', 'order')
    readonly_fields = ('preview_image',)
    ordering = ('order', 'id')

    def preview_image(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="width: 150px; height: auto; border-radius: 5px; border: 1px solid #ccc;" />',
                obj.image.url
            )
        return "لا توجد صورة"

    preview_image.short_description = 'معاينة الصورة'


@admin.register(Project)
class ProjectAdmin(SortableAdminMixin, admin.ModelAdmin):
    form = ProjectAdminForm

    class Media:
        # أدوات الإدارة المخصصة: مساعد الكتابة وتنسيق صفحات المشاريع.
        js = ('admin/ai_assist.js',)
        css = {'all': ('admin/project_admin.css',)}

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path(
                'ai-assist/',
                self.admin_site.admin_view(self.ai_assist_view),
                name='store_project_ai_assist',
            ),
        ]
        return custom + urls

    def ai_assist_view(self, request):
        """نقطة اتصال زراير الذكاء الاصطناعي — محمية بصلاحيات الأدمن تلقائياً."""
        if request.method != 'POST':
            return JsonResponse({'error': 'طريقة غير مسموحة'}, status=405)
        try:
            body = json.loads(request.body.decode('utf-8'))
        except Exception:
            return JsonResponse({'error': 'بيانات غير صالحة'}, status=400)

        result, error = ai_process(body.get('mode', ''), body.get('text', ''))
        if error:
            return JsonResponse({'error': error}, status=400)
        return JsonResponse({'result': result})

    list_display = ('get_image', 'project_title', 'short_description', 'is_published', 'order', 'created_at')
    list_display_links = ('get_image', 'project_title')
    # order اتشالت من هنا: SortableAdminMixin بيحوّل عمود order لمقبض سحب
    # وبيحدّث القيمة بنفسه بالـ AJAX، فمحتاجة تفضل قابلة للسحب مش للكتابة اليدوية.
    list_editable = ('is_published',)
    # لا نعرض مربع البحث في قائمة المشاريع؛ الفلاتر والجدول يكفيان لهذه الشاشة.
    search_fields = ()
    list_filter = ('is_published', 'created_at')
    ordering = ('order', '-created_at')
    list_per_page = 20
    inlines = [ProjectParagraphInline, ProjectImageInline]

    fieldsets = (
        ('المحتوى الأساسي — يظهر للزوار', {
            'fields': ('title', 'description', 'problem', 'solution', 'outcome')
        }),
        ('إعدادات النشر والروابط', {
            'fields': ('is_published', 'order', 'live_url', 'github_url')
        }),
        ('بيانات تقنية داخلية', {
            'classes': ('collapse',),
            'fields': ('technologies',),
            'description': 'التقنيات محفوظة للاستخدام الداخلي فقط ولا تظهر في البورتفوليو بعد التعديل.'
        }),
        ('الترجمة الإنجليزية (اختياري)', {
            'classes': ('collapse',),
            'fields': ('title_en', 'description_en', 'problem_en', 'solution_en', 'outcome_en'),
            'description': 'أضف الترجمة الإنجليزية هنا لتفعيل زرار تبديل اللغة في الموقع.'
        }),
        ('رفع الصور', {
            'fields': ('upload_multiple_images',),
        }),
    )

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        images = request.FILES.getlist('upload_multiple_images')
        for image in images:
            ProjectImage.objects.create(project=obj, image=image)

    @admin.display(description='المعاينة', ordering='id')
    def get_image(self, obj):
        first_image = obj.images.first()
        if first_image and first_image.image:
            return format_html(
                '<img src="{}" class="project-admin-thumb" alt="{}" />',
                first_image.image.url,
                obj.title
            )
        return format_html('<span class="project-admin-empty">بدون صورة</span>')

    @admin.display(description='عنوان المشروع', ordering='title')
    def project_title(self, obj):
        return format_html('<strong class="project-admin-title">{}</strong>', obj.title)

    @admin.display(description='الوصف المختصر')
    def short_description(self, obj):
        text = obj.description or obj.problem or ''
        if len(text) > 115:
            text = text[:112].rstrip() + '...'
        return format_html('<span class="project-admin-description">{}</span>', text)


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'subject', 'is_read', 'created_at')
    list_filter = ('is_read', 'created_at')
    search_fields = ('name', 'email', 'message')
    readonly_fields = ('created_at',)
