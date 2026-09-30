from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0012_projectimage_order'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='problem',
            field=models.TextField(blank=True, default='', verbose_name='المشكلة التي يحلها المشروع'),
        ),
        migrations.AddField(
            model_name='project',
            name='solution',
            field=models.TextField(blank=True, default='', verbose_name='الحل الذي تم تنفيذه'),
        ),
        migrations.AddField(
            model_name='project',
            name='outcome',
            field=models.TextField(blank=True, default='', verbose_name='القيمة أو النتيجة'),
        ),
        migrations.AddField(
            model_name='project',
            name='problem_en',
            field=models.TextField(blank=True, default='', verbose_name='المشكلة (إنجليزي)'),
        ),
        migrations.AddField(
            model_name='project',
            name='solution_en',
            field=models.TextField(blank=True, default='', verbose_name='الحل (إنجليزي)'),
        ),
        migrations.AddField(
            model_name='project',
            name='outcome_en',
            field=models.TextField(blank=True, default='', verbose_name='القيمة أو النتيجة (إنجليزي)'),
        ),
    ]
