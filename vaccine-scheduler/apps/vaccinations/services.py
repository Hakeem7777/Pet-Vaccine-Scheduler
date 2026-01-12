"""
Service layer for vaccination scheduling.
Wraps core.scheduler.RuleBasedScheduler for Django integration.
"""
import datetime
from typing import Dict, List, Optional

from core.scheduler import RuleBasedScheduler, ScheduleItem
from apps.patients.models import Dog


class SchedulerService:
    """
    Django service layer wrapping core.scheduler.RuleBasedScheduler.
    Converts between Django models and scheduler's expected formats.
    """

    def __init__(self):
        self._scheduler = RuleBasedScheduler()

    def calculate_schedule_for_dog(
        self,
        dog: Dog,
        selected_noncore: List[str],
        reference_date: Optional[datetime.date] = None
    ) -> Dict:
        """
        Calculate vaccine schedule for a Django Dog model instance.

        Args:
            dog: Dog model instance
            selected_noncore: List of non-core vaccine IDs to include
            reference_date: Date to calculate from (default: today)

        Returns:
            Dict with categorized schedule items and metadata
        """
        if reference_date is None:
            reference_date = datetime.date.today()

        # Convert VaccinationRecords to scheduler's expected format
        past_history = self._build_history_dict(dog)

        # Call the core scheduler
        schedule_items = self._scheduler.calculate_schedule(
            birth_date=dog.birth_date,
            selected_noncore=selected_noncore,
            past_history=past_history,
            reference_date=reference_date
        )

        # Categorize results
        return self._categorize_schedule(schedule_items, reference_date)

    def _build_history_dict(self, dog: Dog) -> Dict[str, List[datetime.date]]:
        """Convert VaccinationRecords to Dict[vaccine_id, List[dates]]."""
        history: Dict[str, List[datetime.date]] = {}

        records = dog.vaccination_records.select_related('vaccine').all()
        for record in records:
            vaccine_id = record.vaccine.vaccine_id
            if vaccine_id not in history:
                history[vaccine_id] = []
            history[vaccine_id].append(record.date_administered)

        # Sort dates for each vaccine
        for vaccine_id in history:
            history[vaccine_id].sort()

        return history

    def _categorize_schedule(
        self,
        items: List[ScheduleItem],
        reference_date: datetime.date,
        upcoming_window_days: int = 30
    ) -> Dict:
        """
        Categorize schedule items into overdue/upcoming/future.

        Args:
            items: List of ScheduleItem from scheduler
            reference_date: Current date for comparison
            upcoming_window_days: Days to consider as "upcoming" (default 30)

        Returns:
            Dict with 'overdue', 'upcoming', 'future' lists
        """
        overdue = []
        upcoming = []
        future = []

        for item in items:
            item_date = datetime.datetime.strptime(item.date, "%Y-%m-%d").date()
            days_diff = (item_date - reference_date).days

            item_dict = {
                'vaccine': item.vaccine,
                'vaccine_id': item.vaccine_id,
                'dose': item.dose,
                'dose_number': item.dose_number,
                'date': item.date,
                'notes': item.notes,
                'date_range_start': item.date_range_start,
                'date_range_end': item.date_range_end,
                'description': item.description,
                'side_effects_common': item.side_effects_common,
                'side_effects_seek_vet': item.side_effects_seek_vet,
            }

            if days_diff < 0:
                item_dict['days_overdue'] = abs(days_diff)
                overdue.append(item_dict)
            elif days_diff <= upcoming_window_days:
                item_dict['days_until'] = days_diff
                upcoming.append(item_dict)
            else:
                item_dict['days_until'] = days_diff
                future.append(item_dict)

        return {
            'overdue': overdue,
            'upcoming': upcoming,
            'future': future,
        }

    def analyze_history(self, dog: Dog) -> str:
        """
        Analyze vaccination history for a dog.

        Args:
            dog: Dog model instance

        Returns:
            Analysis string with warnings or confirmation
        """
        past_history = self._build_history_dict(dog)
        return self._scheduler.analyze_history(dog.birth_date, past_history)

    def get_age_classification(
        self,
        dog: Dog,
        reference_date: Optional[datetime.date] = None
    ) -> str:
        """
        Get dog's life stage classification.

        Args:
            dog: Dog model instance
            reference_date: Date to calculate from (default: today)

        Returns:
            One of: "puppy", "adolescent", "adult", "senior"
        """
        if reference_date is None:
            reference_date = datetime.date.today()
        return self._scheduler.get_age_classification(dog.birth_date, reference_date)


# Singleton instance for reuse
scheduler_service = SchedulerService()
