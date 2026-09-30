from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0014_update_portfolio_copy'),
    ]

    operations = [
        migrations.CreateModel(
            name='SiteSettings',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('hero_image', models.ImageField(blank=True, null=True, upload_to='site/', verbose_name='الصورة الشخصية')),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'إعدادات الموقع',
                'verbose_name_plural': 'إعدادات الموقع',
            },
        ),
    ]
