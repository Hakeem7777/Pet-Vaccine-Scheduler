import json
import datetime
from typing import List, Dict, Optional
from dataclasses import dataclass

from core.config import VACCINE_RULES_PATH, AGE_PUPPY_MAX_WEEKS, AGE_ADOLESCENT_MAX_WEEKS, AGE_ADULT_MAX_YEARS


@dataclass
class ScheduleItem:
    vaccine: str
    vaccine_id: str
    dose: str
    dose_number: Optional[int]
    date: str
    notes: str
    date_range_start: Optional[str] = None
    date_range_end: Optional[str] = None
    description: Optional[str] = None
    side_effects_common: Optional[List[str]] = None
    side_effects_seek_vet: Optional[List[str]] = None


def classify_dog_age(birth_date: datetime.date, reference_date: datetime.date) -> str:
    """
    Classifies a dog's age into life stage categories.

    Args:
        birth_date: The dog's date of birth.
        reference_date: The current date for age calculation.

    Returns:
        One of: "puppy", "adolescent", "adult", "senior"
    """
    age_weeks = (reference_date - birth_date).days / 7.0
    age_years = age_weeks / 52.0

    if age_weeks <= AGE_PUPPY_MAX_WEEKS:
        return "puppy"
    elif age_weeks <= AGE_ADOLESCENT_MAX_WEEKS:
        return "adolescent"
    elif age_years <= AGE_ADULT_MAX_YEARS:
        return "adult"
    else:
        return "senior"


class RuleBasedScheduler:
    def __init__(self, rules_path: Optional[str] = None):
        path = rules_path or str(VACCINE_RULES_PATH)
        with open(path, "r") as f:
            self.rules = json.load(f)

    def get_age_classification(self, birth_date: datetime.date, reference_date: datetime.date) -> str:
        """
        Returns the dog's life stage classification.

        Args:
            birth_date: The dog's date of birth.
            reference_date: The current date.

        Returns:
            One of: "puppy", "adolescent", "adult", "senior"
        """
        return classify_dog_age(birth_date, reference_date)

    def calculate_schedule(self,
                           birth_date: datetime.date,
                           selected_noncore: List[str],
                           past_history: Dict[str, List[datetime.date]],
                           reference_date: datetime.date) -> List[ScheduleItem]:
        """
        Generates ONLY future doses based on birth date, selected vaccines, and history.

        Args:
            birth_date: The dog's date of birth.
            selected_noncore: List of non-core vaccine IDs to include.
            past_history: Dict mapping vaccine_id to list of dates doses were given.
            reference_date: The current date (passed in for functional purity/testability).

        Returns:
            List of ScheduleItem objects for future doses, sorted by date.

        Raises:
            ValueError: If birth_date is in the future relative to reference_date.
        """
        if birth_date > reference_date:
            raise ValueError(f"birth_date ({birth_date}) cannot be after reference_date ({reference_date})")

        schedule = []
        today = reference_date
        current_age_weeks = (today - birth_date).days / 7.0

        for vaccine in self.rules:
            # 1. Skip if non-core and not selected
            if vaccine['type'] == 'noncore' and vaccine['id'] not in selected_noncore:
                continue

            v_id = vaccine['id']
            history_dates = sorted(past_history.get(v_id, []))
            doses_given_count = len(history_dates)
            last_dose_date = history_dates[-1] if history_dates else None

            # 2. Determine Start Date
            # If the dog is already past the minimum start age and hasn't had the vaccine,
            # the vaccine should be shown as due on the minimum start date (which makes it overdue)
            min_start_date = today
            if 'min_start_age_weeks' in vaccine:
                min_age_date = birth_date + datetime.timedelta(weeks=vaccine['min_start_age_weeks'])
                if min_age_date > today:
                    # Dog is too young - schedule for when they reach minimum age
                    min_start_date = min_age_date
                elif doses_given_count == 0:
                    # Dog is old enough but hasn't had any doses - this is overdue!
                    # Use the date they should have started to show it's overdue
                    min_start_date = min_age_date

            # 3. Find Active Rule
            active_rule = None
            for rule in vaccine['rules']:
                if rule['condition'] == 'all_ages':
                    active_rule = rule
                    break
                elif '<=' in rule['condition']:
                    limit = int(rule['condition'].split('<=')[1].strip())
                    if current_age_weeks <= limit:
                        active_rule = rule
                        break
                elif '>' in rule['condition']:
                    limit = int(rule['condition'].split('>')[1].strip())
                    if current_age_weeks > limit:
                        active_rule = rule
                        break
            
            if active_rule:
                total_series_doses = active_rule['doses']
                interval_days = active_rule['interval_days']
                
                # 4. Determine where to start generating
                if last_dose_date:
                    start_tracking_date = max(last_dose_date + datetime.timedelta(days=interval_days), today)
                else:
                    start_tracking_date = min_start_date

                # 5. Generate Initial Series (if not complete)
                current_dose_num = doses_given_count + 1
                min_interval = active_rule.get('min_interval', interval_days)
                max_interval = active_rule.get('max_interval', interval_days)

                while current_dose_num <= total_series_doses:
                    # Use the vaccine description for meaningful context
                    vaccine_description = vaccine.get('description', '')
                    is_final_dose = current_dose_num == total_series_doses

                    # AAHA/WSAVA guideline: Final DHPP dose for puppies must be after 16 weeks
                    # to ensure maternal antibodies have waned
                    dose_date = start_tracking_date
                    final_dose_note = ""
                    if is_final_dose and v_id == 'core_dap':
                        min_age_16_weeks = birth_date + datetime.timedelta(weeks=16)
                        if dose_date < min_age_16_weeks:
                            dose_date = min_age_16_weeks
                            final_dose_note = " Final dose scheduled after 16 weeks per AAHA/WSAVA guidelines to ensure maternal antibodies have waned."

                    if is_final_dose:
                        dose_note = (vaccine_description if vaccine_description else "Completes initial series.") + final_dose_note
                    else:
                        dose_note = vaccine_description if vaccine_description else f"Series continues ({interval_days} day interval)."

                    # Calculate date range for this dose
                    if current_dose_num == 1 and not last_dose_date:
                        # First dose - range starts at min_start_date
                        range_start = min_start_date
                        range_end = min_start_date + datetime.timedelta(days=max_interval)
                    else:
                        # Subsequent doses - range based on intervals from previous dose/date
                        base_date = last_dose_date if current_dose_num == doses_given_count + 1 and last_dose_date else start_tracking_date - datetime.timedelta(days=interval_days)
                        range_start = base_date + datetime.timedelta(days=min_interval)
                        range_end = base_date + datetime.timedelta(days=max_interval)

                    # For final DHPP dose, adjust range to enforce 16-week minimum
                    if is_final_dose and v_id == 'core_dap':
                        min_age_16_weeks = birth_date + datetime.timedelta(weeks=16)
                        if range_start < min_age_16_weeks:
                            range_start = min_age_16_weeks
                        if range_end < min_age_16_weeks:
                            range_end = min_age_16_weeks + datetime.timedelta(days=max_interval)

                    side_effects = vaccine.get('side_effects', {})
                    schedule.append(ScheduleItem(
                        vaccine=vaccine['name'],
                        vaccine_id=v_id,
                        dose=f"Initial Series: Dose {current_dose_num}",
                        dose_number=current_dose_num,
                        date=dose_date.strftime("%Y-%m-%d"),
                        notes=dose_note,
                        date_range_start=range_start.strftime("%Y-%m-%d"),
                        date_range_end=range_end.strftime("%Y-%m-%d"),
                        description=vaccine.get('description'),
                        side_effects_common=side_effects.get('common'),
                        side_effects_seek_vet=side_effects.get('seek_vet_if')
                    ))
                    start_tracking_date += datetime.timedelta(days=interval_days)
                    current_dose_num += 1

                # 6. Booster Logic
                # Determine when the series was (or will be) finished
                series_complete_date = None
                
                # Check newly generated schedule first
                this_vax_schedule = [s for s in schedule if s.vaccine == vaccine['name'] and "Initial Series" in s.dose]
                if this_vax_schedule:
                    last_generated_date = datetime.datetime.strptime(this_vax_schedule[-1].date, "%Y-%m-%d").date()
                    series_complete_date = last_generated_date
                # Check history
                elif doses_given_count >= total_series_doses and last_dose_date:
                    series_complete_date = last_dose_date
                
                if series_complete_date:
                    # Is this the first booster (1 year after series) or subsequent?
                    # Simply: if we just finished the series, next is 'initial_booster'.
                    # If we already had the series years ago, we might be on 'subsequent'.
                    
                    # Simple Logic: Schedule the NEXT required booster
                    initial_booster_due = series_complete_date + datetime.timedelta(days=active_rule['initial_booster_days'])
                    
                    # Get vaccine description for booster notes
                    vaccine_description = vaccine.get('description', '')
                    booster_note = f"Booster maintains immunity. {vaccine_description}" if vaccine_description else "Revaccination to maintain immunity."

                    side_effects = vaccine.get('side_effects', {})
                    if initial_booster_due > today:
                        # The 1-year booster is in the future
                        schedule.append(ScheduleItem(
                            vaccine=vaccine['name'],
                            vaccine_id=v_id,
                            dose="1-Year Booster",
                            dose_number=None,
                            date=initial_booster_due.strftime("%Y-%m-%d"),
                            notes=booster_note,
                            description=vaccine.get('description'),
                            side_effects_common=side_effects.get('common'),
                            side_effects_seek_vet=side_effects.get('seek_vet_if')
                        ))
                    else:
                        # The 1-year booster is past due or was already given (assuming history isn't exhaustive, we schedule next cycle)
                        # If we assume the dog is up to date, we schedule based on subsequent intervals
                        # For safety in this app: If 1-year booster date is passed, we show it as "Due Now/Overdue"
                        # unless we have logic to see if *that* was given.
                        # (Simplification: Show Due Now)
                        schedule.append(ScheduleItem(
                            vaccine=vaccine['name'],
                            vaccine_id=v_id,
                            dose="Booster (Annual or 3-Year)",
                            dose_number=None,
                            date=max(initial_booster_due, today).strftime("%Y-%m-%d"),
                            notes=booster_note,
                            description=vaccine.get('description'),
                            side_effects_common=side_effects.get('common'),
                            side_effects_seek_vet=side_effects.get('seek_vet_if')
                        ))

        schedule.sort(key=lambda x: x.date)
        return schedule

    def analyze_history(self, 
                        birth_date: datetime.date, 
                        past_history: Dict[str, List[datetime.date]]) -> str:
        """
        Analyzes past history using JSON defined min/max intervals.
        """
        analysis_lines = []
        
        for v_id, dates in past_history.items():
            # Find vaccine rule config
            v_config = next((v for v in self.rules if v['id'] == v_id), None)
            if not v_config: continue
            
            v_name = v_config['name']
            dates = sorted(dates)
            
            # Use the first rule to get min/max intervals (simplification)
            rule = v_config['rules'][0] 
            min_interval = rule.get('min_interval', 14)
            max_interval = rule.get('max_interval', 42) # Default generous if missing

            for i, date_given in enumerate(dates):
                dose_num = i + 1
                age_at_dose_weeks = (date_given - birth_date).days / 7.0
                
                # Age check (Standard 6 weeks for most)
                if age_at_dose_weeks < 6:
                    analysis_lines.append(f"- WARNING: {v_name} Dose {dose_num} given at {age_at_dose_weeks:.1f} weeks. Potentially too early.")
                
                if dose_num > 1:
                    prev_date = dates[i-1]
                    interval = (date_given - prev_date).days
                    
                    if interval < min_interval:
                        analysis_lines.append(f"- WARNING: {v_name} Dose {dose_num} given {interval} days after previous. Too close (min {min_interval} days).")
                    elif interval > max_interval:
                         analysis_lines.append(f"- NOTE: {v_name} Dose {dose_num} given {interval} days after previous. Ensure series is not overdue.")
                         
        if not analysis_lines:
            return "History appears consistent with standard timing intervals."
        
        return "\n".join(analysis_lines)