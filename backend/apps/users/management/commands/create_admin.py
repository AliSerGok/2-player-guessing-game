from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Create admin user with email admin@gmail.com'

    def handle(self, *args, **options):
        email = 'admin@gmail.com'
        password = 'adminadmin'

        # Check if admin already exists
        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f'Admin user {email} already exists'))
            return

        # Create admin user
        admin = User.objects.create_user(
            email=email,
            password=password,
            age=30,
            role='admin'
        )
        admin.is_staff = True
        admin.is_superuser = True
        admin.save()

        self.stdout.write(self.style.SUCCESS(f'Successfully created admin user: {email}'))
        self.stdout.write(self.style.SUCCESS(f'Password: {password}'))
