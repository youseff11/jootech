from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0011_alter_contactmessage_id_alter_project_id_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='projectimage',
            name='order',
            field=models.PositiveIntegerField(default=0, help_text='اكتب رقم لترتيب الصورة. الصورة ذات الرقم الأصغر تظهر أولاً.', verbose_name='ترتيب الصورة'),
        ),
        migrations.AlterModelOptions(
            name='projectimage',
            options={'ordering': ['order', 'id'], 'verbose_name': 'صورة المشروع', 'verbose_name_plural': 'صور المشروع'},
        ),
    ]
