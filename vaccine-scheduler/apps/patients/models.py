"""
Models for patient (dog) management.
"""
import datetime
from django.conf import settings
from django.db import models


class Dog(models.Model):
    """
    Represents a canine patient in the vaccine scheduler system.
    """

    SEX_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('MN', 'Male (Neutered)'),
        ('FS', 'Female (Spayed)'),
    ]

    HEALTH_YES_NO_UNSURE = [
        ('no', 'No'),
        ('yes', 'Yes'),
        ('unsure', 'Not sure'),
    ]

    HEALTH_YES_NO_NA = [
        ('no', 'No'),
        ('yes', 'Yes'),
        ('na', 'N/A'),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='dogs',
        help_text="User who owns this dog"
    )
    name = models.CharField(
        max_length=100,
        help_text="Dog's name"
    )
    breed = models.CharField(
        max_length=100,
        blank=True,
        help_text="Dog's breed"
    )
    sex = models.CharField(
        max_length=2,
        choices=SEX_CHOICES,
        default='M',
        help_text="Dog's sex"
    )
    birth_date = models.DateField(
        help_text="Dog's date of birth"
    )
    weight_kg = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Dog's weight in kilograms"
    )

    # Living environment flags (for risk assessment)
    env_indoor_only = models.BooleanField(
        default=False,
        help_text="Dog lives primarily indoors"
    )
    env_dog_parks = models.BooleanField(
        default=False,
        help_text="Dog visits dog parks regularly"
    )
    env_daycare_boarding = models.BooleanField(
        default=False,
        help_text="Dog attends daycare or boarding facilities"
    )
    env_travel_shows = models.BooleanField(
        default=False,
        help_text="Dog travels or participates in shows"
    )
    env_tick_exposure = models.BooleanField(
        default=False,
        help_text="Dog frequents wooded areas, tall grass, or tick-endemic regions"
    )

    # Health screening fields (for vaccine contraindication assessment)
    health_vaccine_reaction = models.CharField(
        max_length=6,
        choices=HEALTH_YES_NO_UNSURE,
        default='no',
        help_text="Has dog ever had a reaction to a vaccine?"
    )
    health_prescription_meds = models.CharField(
        max_length=6,
        choices=HEALTH_YES_NO_UNSURE,
        default='no',
        help_text="Is dog currently taking prescription medications?"
    )
    health_chronic_condition = models.CharField(
        max_length=6,
        choices=HEALTH_YES_NO_UNSURE,
        default='no',
        help_text="Has vet diagnosed a long-term medical condition?"
    )
    health_immune_condition = models.CharField(
        max_length=6,
        choices=HEALTH_YES_NO_UNSURE,
        default='no',
        help_text="Has dog been diagnosed with an immune-related condition?"
    )
    health_immunosuppressive_meds = models.CharField(
        max_length=6,
        choices=HEALTH_YES_NO_UNSURE,
        default='no',
        help_text="Is dog currently receiving immunosuppressive medications?"
    )
    health_pregnant_breeding = models.CharField(
        max_length=6,
        choices=HEALTH_YES_NO_NA,
        default='no',
        help_text="Is dog currently pregnant or being used for breeding?"
    )

    # Medical conditions and medications (for condition-specific vaccine rules)
    medical_conditions = models.JSONField(
        default=list,
        blank=True,
        help_text="List of diagnosed conditions: epilepsy, autoimmune, cancer"
    )
    medications = models.JSONField(
        default=dict,
        blank=True,
        help_text="Medications by category, e.g. {'anti_seizure': ['keppra'], 'flea_tick': ['nexgard']}"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'dogs'
        ordering = ['-created_at']
        verbose_name = 'Dog'
        verbose_name_plural = 'Dogs'

    def __str__(self) -> str:
        return f"{self.name} ({self.breed or 'Unknown breed'})"

    @property
    def age_weeks(self) -> int:
        """Calculate the dog's age in weeks."""
        today = datetime.date.today()
        delta = today - self.birth_date
        return delta.days // 7

    @property
    def health_context(self) -> dict:
        """Extract health screening flags as a dict for the scheduler."""
        return {
            'vaccine_reaction': self.health_vaccine_reaction,
            'prescription_meds': self.health_prescription_meds,
            'chronic_condition': self.health_chronic_condition,
            'immune_condition': self.health_immune_condition,
            'immunosuppressive_meds': self.health_immunosuppressive_meds,
            'pregnant_breeding': self.health_pregnant_breeding,
            'medical_conditions': self.medical_conditions or [],
            'medications': self.medications or {},
        }

    @property
    def age_classification(self) -> str:
        """
        Get the dog's life stage classification.
        Returns: puppy, adolescent, adult, or senior
        """
        weeks = self.age_weeks

        if weeks <= 16:
            return 'puppy'
        elif weeks <= 52:
            return 'adolescent'
        elif weeks <= 7 * 52:  # 7 years
            return 'adult'
        else:
            return 'senior'
