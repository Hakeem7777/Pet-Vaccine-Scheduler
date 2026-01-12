"""
Management command to load vaccine rules from JSON into database.
"""
import json
from django.core.management.base import BaseCommand
from django.conf import settings

from apps.vaccinations.models import Vaccine


class Command(BaseCommand):
    help = 'Load vaccine rules from vaccine_rules.json into the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--path',
            type=str,
            help='Path to vaccine_rules.json (default: data/vaccine_rules.json)',
        )

    def handle(self, *args, **options):
        # Determine path to vaccine rules JSON
        if options['path']:
            rules_path = options['path']
        else:
            rules_path = settings.BASE_DIR / 'data' / 'vaccine_rules.json'

        self.stdout.write(f"Loading vaccines from: {rules_path}")

        try:
            with open(rules_path, 'r') as f:
                rules = json.load(f)
        except FileNotFoundError:
            self.stderr.write(
                self.style.ERROR(f"File not found: {rules_path}")
            )
            return
        except json.JSONDecodeError as e:
            self.stderr.write(
                self.style.ERROR(f"Invalid JSON: {e}")
            )
            return

        created_count = 0
        updated_count = 0

        for rule in rules:
            vaccine, created = Vaccine.objects.update_or_create(
                vaccine_id=rule['id'],
                defaults={
                    'name': rule['name'],
                    'vaccine_type': rule['type'],
                    'min_start_age_weeks': rule.get('min_start_age_weeks'),
                    'rules_json': rule['rules'],
                    'is_active': True,
                }
            )

            if created:
                created_count += 1
                self.stdout.write(f"  Created: {vaccine.name}")
            else:
                updated_count += 1
                self.stdout.write(f"  Updated: {vaccine.name}")

        self.stdout.write(
            self.style.SUCCESS(
                f"\nLoaded vaccines: {created_count} created, {updated_count} updated"
            )
        )
