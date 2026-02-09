from django.db import migrations

ADMIN_EMAIL = 'admin@vaccineplanner.com'


def set_admin_user(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    User.objects.filter(email=ADMIN_EMAIL).update(is_staff=True)


def unset_admin_user(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    User.objects.filter(email=ADMIN_EMAIL).update(is_staff=False)


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0003_pendingregistration'),
    ]

    operations = [
        migrations.RunPython(set_admin_user, unset_admin_user),
    ]
