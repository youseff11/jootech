from django.db import migrations
from django.db.models import Max, Q


PROJECT = {
    'title': 'eagle-lingua',
    'title_en': 'eagle-lingua',
    'description': 'موقع تعريفي ثنائي اللغة لشركة Eaglelingua لخدمات الترجمة، يجمع عرض الخدمات والمقالات والأسئلة الشائعة ووسائل التواصل وطلب عرض سعر في تجربة واحدة.',
    'description_en': 'A bilingual corporate website for Eaglelingua Translation Services, bringing service information, articles, FAQs, contact options, and quote requests into one experience.',
    'technologies': 'React 19, Vite, JavaScript, CSS',
    'live_url': 'https://www.eaglelingua.com/',
    'github_url': '',
    'is_published': True,
    'problem': 'تحتاج شركة الترجمة إلى عرض خدماتها المتخصصة بوضوح لجمهور عربي وإنجليزي، وتسهيل انتقال الزائر من معرفة الخدمة إلى التواصل وطلب عرض سعر.',
    'problem_en': 'The translation company needed to explain its specialist services to Arabic- and English-speaking visitors and provide a clear path from service discovery to an inquiry or quote request.',
    'solution': 'طوّرت موقعًا باستخدام React وVite، مع دعم العربية والإنجليزية واتجاه RTL، وصفحات مستقلة للخدمات والمقالات، وتصميم متجاوب، وروابط مباشرة لواتساب والهاتف والبريد الإلكتروني.',
    'solution_en': 'I built a React and Vite website with Arabic and English support, RTL layouts, dedicated service and article pages, responsive styling, and direct WhatsApp, phone, and email links.',
    'outcome': 'يجمع الموقع معلومات الشركة وخدماتها ومحتواها في واجهة منظمة، ويمنح الزائر مسارًا مباشرًا لاستكشاف الخدمة المناسبة وبدء التواصل، دون الحاجة إلى نظام خلفي لإدارة الطلبات.',
    'outcome_en': 'The website organizes company information, services, and editorial content in one interface, giving visitors a direct route to explore relevant services and start a conversation without requiring an order-management backend.',
}

PARAGRAPHS = [
    (
        'eagle-lingua موقع تعريفي لشركة Eaglelingua لخدمات الترجمة، يقدّم خدمات مثل ترجمة المستندات والترجمة المعتمدة والقانونية والطبية والتجارية والتقنية والترجمة الفورية والتوطين. يجمع الموقع صفحات الشركة والخدمات التفصيلية وآراء العملاء والأسئلة الشائعة ومدونة مقالات، مع محتوى بالعربية والإنجليزية لتسهيل استكشاف الخدمات المناسبة لكل زائر.',
        'eagle-lingua is a corporate website for Eaglelingua Translation Services, presenting document, certified, legal, medical, commercial, and technical translation alongside interpretation and localization. It combines company information, detailed service pages, testimonials, FAQs, and an article blog, with Arabic and English content to help visitors explore the services relevant to them.',
    ),
    (
        'بنيت الواجهة باستخدام React 19 وVite وJavaScript وCSS، مع نظام تبديل لغة يحفظ اختيار المستخدم ويدعم اتجاه الكتابة من اليمين إلى اليسار. يشمل التنفيذ قائمة تنقل متجاوبة، ومكونات قابلة لإعادة الاستخدام، وتأثيرات ظهور أثناء التمرير، وصورًا بتحميل كسول وبديل عند تعذر التحميل، مع الحفاظ على مسارات الصفحات القديمة وروابط الخدمات والمقالات.',
        'I built the interface with React 19, Vite, JavaScript, and CSS, including a language switcher that remembers the visitor’s selection and supports right-to-left layouts. The implementation includes responsive navigation, reusable components, scroll reveal effects, lazy-loaded images with loading fallbacks, and routing that preserves legacy page, service, and article URLs.',
    ),
    (
        'تسهّل تجربة التواصل الوصول إلى الشركة عبر واتساب والهاتف والبريد الإلكتروني، وتضم نماذج للاستفسارات وطلبات عروض الأسعار مع التحقق من الحقول الأساسية. يحتوي نموذج عرض السعر على اختيار الخدمة ولغتي المصدر والهدف وحجم العمل والموعد المطلوب والتفاصيل، ويجهّز رسالة للتواصل عبر واتساب. كما يتضمن الموقع عناوين وأوصافًا وروابط أساسية للصفحات، وبيانات لمعاينة الروابط عند المشاركة، وملفات robots وsitemap لدعم فهرسة المحتوى.',
        'Visitors can contact the company through WhatsApp, phone, or email, with inquiry and quote-request forms that validate essential fields. The quote form collects the service, source and target languages, work volume, requested deadline, and project details, then prepares a WhatsApp message. The website also includes page titles, descriptions, canonical URLs, social-sharing metadata, and robots and sitemap files to support content indexing.',
    ),
]


def add_eagle_lingua(apps, schema_editor):
    Project = apps.get_model('store', 'Project')
    Paragraph = apps.get_model('store', 'ProjectParagraph')
    database = schema_editor.connection.alias
    projects = Project.objects.using(database)
    # Keep any project already added or edited through the dashboard intact.
    if projects.filter(Q(title__iexact='eagle-lingua') | Q(title_en__iexact='eagle-lingua')).exists():
        return
    last_order = projects.aggregate(last_order=Max('order'))['last_order']
    project = projects.create(**PROJECT, order=0 if last_order is None else last_order + 1)
    Paragraph.objects.using(database).bulk_create([
        Paragraph(project_id=project.pk, text=ar, text_en=en, order=order)
        for order, (ar, en) in enumerate(PARAGRAPHS)
    ])
    # Images are intentionally left empty for the owner to upload later.


class Migration(migrations.Migration):
    dependencies = [('store', '0015_sitesettings')]
    operations = [migrations.RunPython(add_eagle_lingua, migrations.RunPython.noop)]
