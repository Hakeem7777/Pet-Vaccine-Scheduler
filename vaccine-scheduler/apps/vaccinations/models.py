"""
Models for vaccination management.
"""
from django.db import models

from apps.patients.models import Dog


class Vaccine(models.Model):
    """
    Vaccine definitions loaded from vaccine_rules.json.
    Stored in DB for relational integrity and API exposure.
    """
    TYPE_CHOICES = [
        ('core', 'Core'),
        ('core_conditional', 'Core Conditional'),
        ('noncore', 'Non-Core'),
    ]

    vaccine_id = models.CharField(
        max_length=50,
        unique=True,
        help_text="Unique identifier (e.g., 'core_dap')"
    )
    name = models.CharField(
        max_length=100,
        help_text="Display name (e.g., 'Distemper, Adenovirus, Parvovirus (DAP)')"
    )
    vaccine_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        help_text="Vaccine category"
    )
    min_start_age_weeks = models.IntegerField(
        null=True,
        blank=True,
        help_text="Minimum age in weeks to start this vaccine"
    )
    rules_json = models.JSONField(
        help_text="Vaccination rules from vaccine_rules.json"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this vaccine is currently available"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'vaccines'
        ordering = ['vaccine_type', 'name']
        verbose_name = 'Vaccine'
        verbose_name_plural = 'Vaccines'

    def __str__(self) -> str:
        return self.name


class VaccinationRecord(models.Model):
    """
    Records of administered vaccinations.
    """
    dog = models.ForeignKey(
        Dog,
        on_delete=models.CASCADE,
        related_name='vaccination_records',
        help_text="Dog that received the vaccination"
    )
    vaccine = models.ForeignKey(
        Vaccine,
        on_delete=models.PROTECT,
        related_name='records',
        help_text="Vaccine that was administered"
    )
    date_administered = models.DateField(
        help_text="Date the vaccine was given"
    )
    dose_number = models.IntegerField(
        null=True,
        blank=True,
        help_text="Dose number in the series (optional)"
    )
    notes = models.TextField(
        blank=True,
        help_text="Additional notes about the vaccination"
    )
    administered_by = models.CharField(
        max_length=100,
        blank=True,
        help_text="Name of veterinarian or clinic"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'vaccination_records'
        ordering = ['-date_administered']
        indexes = [
            models.Index(fields=['dog', 'vaccine']),
            models.Index(fields=['date_administered']),
        ]
        verbose_name = 'Vaccination Record'
        verbose_name_plural = 'Vaccination Records'

    def __str__(self) -> str:
        return f"{self.dog.name} - {self.vaccine.name} ({self.date_administered})"
