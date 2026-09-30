from django.db import migrations


PROJECT_COPY = {
    3: {
        'title': 'الباسطي جروب — شركة متخصصة في أنظمة الأمن المتكاملة.',
        'title_en': 'Al-Basty Group — Integrated Security Systems Company',
        'description': 'منصة Cyber تجمع متجرًا إلكترونيًا مع نظام ERP لإدارة منتجات الأنظمة الأمنية والمبيعات والمخزون والحسابات من منظومة رقمية واحدة.',
        'description_en': 'Cyber is an e-commerce and ERP platform that brings together security-system products, sales, inventory, and accounting in one connected digital system.',
        'problem': 'كانت الشركة تحتاج إلى إدارة المبيعات والمخزون والحسابات والمنتجات الأمنية من منظومة واحدة، بدل توزيع العمليات بين أدوات منفصلة يصعب متابعتها.',
        'solution': 'طوّرت منصة Cyber بمتجر ثنائي اللغة، وربطتها بوحدات إدارة المخزون والباقات الترويجية والحسابات والتقارير، مع لوحة تحكم تمنح الفريق رؤية أوضح للعمليات.',
        'outcome': 'أصبح لدى الشركة مسار موحد لإدارة المنتج من عرضه وبيعه وحتى متابعة المخزون والحسابات، بينما يحصل العميل على تجربة شراء أكثر وضوحًا وتفاعلاً.',
        'problem_en': 'The company needed one system to manage security products, sales, inventory, and accounting instead of distributing operations across disconnected tools.',
        'solution_en': 'I built Cyber as a bilingual storefront connected to inventory, promotional bundles, accounting, reporting, and an administrative dashboard for clearer operational control.',
        'outcome_en': 'The result is a unified product workflow—from listing and selling to inventory and accounting—combined with a clearer and more interactive customer buying experience.',
    },
    5: {
        'title': 'منصة إلكترونية متكاملة لإدارة منظومة التعلم الإلكتروني.',
        'title_en': 'Integrated Learning Management Platform',
        'description': 'منصة LMS تربط المدرسين والطلاب والإدارة في تجربة تعليم إلكتروني واحدة، مع إدارة للدورات والمحتوى والاختبارات والتقدم والشهادات.',
        'description_en': 'An LMS that connects instructors, students, and administrators in one learning experience, with course, content, assessment, progress, and certificate management.',
        'problem': 'إدارة الدورات والطلاب والاختبارات والشهادات وحماية المحتوى التعليمي تحتاج إلى نظام موحد يضمن لكل مستخدم صلاحياته ومساره الواضح.',
        'solution': 'بنيت منصة تعليمية متعددة الأدوار تشمل لوحات للمدرس والطالب والإدارة، وبثًا محميًا للمحتوى، ومحرك اختبارات يدعم التصحيح الآلي والمقالي، ونظام دعم وقسائم وشهادات قابلة للتحقق.',
        'outcome': 'تجمع المنصة رحلة الطالب التعليمية وإدارة المدرس والتشغيل الإداري في مكان واحد، مع رؤية أفضل للتقدم والاختبارات والاشتراكات دون التضحية بحماية المحتوى.',
        'problem_en': 'Managing courses, students, assessments, certificates, and protected educational content requires one system with clear user roles and workflows.',
        'solution_en': 'I built a role-based learning platform with instructor, student, and admin dashboards, protected content streaming, mixed-format assessments, support tickets, coupons, and verifiable certificates.',
        'outcome_en': 'The platform unifies the student journey, instructor operations, and administrative workflows while improving visibility into progress, assessments, and enrollments without compromising content protection.',
    },
    1: {
        'title': 'معرض أثاث أبو يحيى',
        'title_en': 'Abu Yahya Furniture Showroom',
        'description': 'متجر إلكتروني للأثاث المصنّع حسب الطلب، يدعم اختلاف المقاسات والخامات والأسعار، مع إدارة للمخزون والطلبات وإشعارات متابعة احترافية.',
        'description_en': 'A made-to-order furniture store that supports size, material, and price variations, with inventory, order management, and professional status notifications.',
        'problem': 'بيع الأثاث حسب الطلب يجعل السعر والمخزون والطلب مرتبطين بالمقاس واللون والخامة، وهو ما يصعب عرضه وإدارته من خلال متجر تقليدي.',
        'solution': 'صممت نظام منتجات مرنًا يربط المتغيرات بالأسعار حسب المقاس، وأضافت المنصة دورة كاملة للطلبات والإشعارات ولوحة تحكم للمبيعات والمخزون والفواتير.',
        'outcome': 'يحصل العميل على تجربة اختيار وشراء أكثر دقة، بينما يستطيع فريق المعرض متابعة الطلبات والأسعار والمخزون من لوحة واحدة وبخطوات أوضح.',
        'problem_en': 'Made-to-order furniture ties pricing, availability, and order details to size, color, and material, making them difficult to present and manage through a conventional store.',
        'solution_en': 'I designed a flexible product system that connects variants to size-based pricing, then added an end-to-end order workflow, notifications, and a dashboard for sales, inventory, and invoices.',
        'outcome_en': 'Customers get a more accurate selection and buying experience, while the showroom team can manage orders, pricing, and inventory from one clearer workspace.',
    },
    2: {
        'title': 'متجر ملابس إلكتروني',
        'title_en': 'Online Clothing Store',
        'description': 'متجر ملابس إلكتروني يدير الألوان والمقاسات والمخزون لحظيًا، ويدعم تتبع التحويلات وتحليل المبيعات والعروض الترويجية.',
        'description_en': 'An online clothing store with real-time color, size, and inventory management, conversion tracking, sales analytics, and promotional offers.',
        'problem': 'تعدد الألوان والمقاسات يجعل ضبط المخزون وتجنب بيع منتج غير متاح تحديًا مستمرًا، كما تحتاج الحملات الإعلانية إلى بيانات حقيقية عن سلوك الزوار والشراء.',
        'solution': 'بنيت نظام Variants يربط كل لون بالمقاسات والصور المتاحة، مع تحديث المخزون، وتجربة Shop–Cart–Checkout محسّنة، وربط أدوات التحليل والتتبع ولوحة مبيعات وعروض.',
        'outcome': 'يستطيع المتجر عرض المنتجات المتاحة بدقة ومتابعة الطلبات والمبيعات، كما يحصل صاحب النشاط على بيانات تساعده في فهم أداء الحملات والعروض.',
        'problem_en': 'Managing multiple colors and sizes makes inventory accuracy and out-of-stock prevention a constant challenge, while advertising campaigns need real purchase and visitor data.',
        'solution_en': 'I built a variant system linking each color to its available sizes and images, with inventory updates, an optimized Shop–Cart–Checkout flow, analytics and tracking integrations, and sales and offers dashboards.',
        'outcome_en': 'The store can present availability more accurately and monitor orders and sales, while the business owner gains data to understand campaign and offer performance.',
    },
    4: {
        'title': 'منصة ذكية للسياحة التراثية والعلاجية',
        'title_en': 'Smart Heritage and Medical Tourism Platform',
        'description': 'منصة تجمع اكتشاف الوجهات التراثية والعلاجية وتخطيط الرحلات والحجوزات والتوصيات الذكية في تجربة واحدة للزائر والإدارة.',
        'description_en': 'A platform that combines heritage and medical destination discovery, trip planning, bookings, and smart recommendations for visitors and administrators.',
        'problem': 'يحتاج الزائر إلى جمع معلومات الوجهات والميزانية والحجوزات والخدمات العلاجية من مصادر متفرقة، بينما تحتاج الإدارة إلى إدارة الأماكن والأطباء والحجوزات من لوحة واحدة.',
        'solution': 'طوّرت منصة تصنّف الوجهات وتدعم خطط الرحلات والميزانية والتوصيات، مع لوحة إدارة للحجوزات والأطباء والتقييمات، وجولات 360° وماسح مواقع ومساعد ذكي للاستفسارات.',
        'outcome': 'تنتقل تجربة الزائر من اكتشاف الوجهة إلى التخطيط والحجز داخل مسار واحد، وتحصل الإدارة على أدوات أوضح لتحديث المحتوى ومتابعة الحجوزات والخدمات العلاجية.',
        'problem_en': 'Visitors often need to collect destination, budget, booking, and medical-service information from scattered sources, while administrators need one workspace for places, doctors, and bookings.',
        'solution_en': 'I built a platform for destination categories, itinerary and budget planning, recommendations, booking and review management, plus 360° tours, location scanning, and a smart inquiry assistant.',
        'outcome_en': 'The visitor journey moves from discovery to planning and booking in one flow, while administrators gain clearer tools for content, reservations, and medical-tourism services.',
    },
    8: {
        'title': 'سُفّوف — موقع تعريفي لشركة هندسة صناعية',
        'title_en': 'Suffuf — Bilingual Website for an Industrial Engineering Company',
        'description': 'موقع تعريفي ثنائي اللغة لشركة هندسة صناعية، يعرض الخدمات والمشروعات ويسهّل على العملاء فهم نطاق العمل وبدء التواصل.',
        'description_en': 'A bilingual company website for an industrial engineering business, presenting its services and projects while making it easier for prospects to understand the offering and get in touch.',
        'problem': 'كانت الشركة تحتاج إلى حضور رقمي احترافي يشرح خدماتها ومشروعاتها الهندسية بوضوح لجمهور عربي وإنجليزي، بدل الاعتماد على معلومات متفرقة يصعب استكشافها.',
        'solution': 'طوّرت موقعًا ثنائي اللغة مع صفحات منظمة للخدمات والمشروعات، ولوحة تحكم لإدارة المحتوى والمعرض، وبنية تعتمد على Django وPostgreSQL وCloudinary لعرض الصور بكفاءة.',
        'outcome': 'أصبح لدى الشركة واجهة رقمية أوضح لعرض خبرتها ومشروعاتها، ومسار مباشر للزائر لاستكشاف الخدمات والانتقال إلى طلب مشروع أو تواصل جديد.',
        'problem_en': 'The company needed a professional digital presence that clearly explained its engineering services and projects to Arabic- and English-speaking audiences instead of relying on scattered information.',
        'solution_en': 'I built a bilingual website with structured service and project pages, a content-management dashboard, and a Django, PostgreSQL, and Cloudinary foundation for efficient media presentation.',
        'outcome_en': 'The company now has a clearer digital interface for presenting its expertise and projects, with a direct path for visitors to explore services and start a project inquiry.',
    },
}


def update_portfolio_copy(apps, schema_editor):
    Project = apps.get_model('store', 'Project')
    for project_id, values in PROJECT_COPY.items():
        Project.objects.filter(pk=project_id).update(**values)


def reverse_portfolio_copy(apps, schema_editor):
    # Content migrations are intentionally not destructive on rollback.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0013_project_case_study_fields'),
    ]

    operations = [
        migrations.RunPython(update_portfolio_copy, reverse_portfolio_copy),
    ]
