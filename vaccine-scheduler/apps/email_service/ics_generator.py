"""
ICS calendar file generator for vaccination schedules.
"""
from datetime import datetime
from typing import Optional
from urllib.parse import urlencode
import uuid


def generate_ics_content(dog_name: str, schedule: dict) -> str:
    """
    Generate ICS file content for all scheduled vaccines.

    Args:
        dog_name: Name of the dog
        schedule: Schedule dict with overdue, upcoming, future arrays

    Returns:
        ICS file content as string
    """
    all_items = (
        schedule.get("overdue", []) +
        schedule.get("upcoming", []) +
        schedule.get("future", [])
    )

    if not all_items:
        return ""

    events = []
    for item in all_items:
        event = _create_event(item, dog_name)
        if event:
            events.append(event)

    ics_content = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Vaccine Scheduler//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{dog_name} Vaccine Schedule",
    ]

    for event in events:
        ics_content.extend(event)

    ics_content.append("END:VCALENDAR")

    return "\r\n".join(ics_content)


def _create_event(item: dict, dog_name: str) -> list:
    """Create a single calendar event."""
    try:
        date_str = item.get("date", "")
        if not date_str:
            return []

        # Parse the date
        date = datetime.strptime(date_str, "%Y-%m-%d")
        date_formatted = date.strftime("%Y%m%d")

        vaccine_name = item.get("vaccine", "Vaccination")
        dose = item.get("dose", "")
        notes = item.get("notes", "")

        # Build description
        description_parts = [f"Dose: {dose}"]
        if notes:
            description_parts.append(f"Notes: {notes}")
        description = "\\n".join(description_parts)

        # Generate unique ID
        uid = f"{uuid.uuid4()}@vaccinescheduler"

        event = [
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTAMP:{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}",
            f"DTSTART;VALUE=DATE:{date_formatted}",
            f"DTEND;VALUE=DATE:{date_formatted}",
            f"SUMMARY:{vaccine_name} Vaccination - {dog_name}",
            f"DESCRIPTION:{description}",
            "STATUS:CONFIRMED",
            "TRANSP:TRANSPARENT",
            "END:VEVENT",
        ]

        return event

    except (ValueError, KeyError) as e:
        print(f"Error creating event: {e}")
        return []


def generate_google_calendar_url(dog_name: str, schedule: dict) -> Optional[str]:
    """
    Generate Google Calendar URL for the first priority vaccine.

    Priority: overdue > upcoming > future

    Args:
        dog_name: Name of the dog
        schedule: Schedule dict with overdue, upcoming, future arrays

    Returns:
        Google Calendar URL or None if no vaccines
    """
    # Get first priority item
    priority_item = None
    for key in ["overdue", "upcoming", "future"]:
        items = schedule.get(key, [])
        if items:
            priority_item = items[0]
            break

    if not priority_item:
        return None

    try:
        date_str = priority_item.get("date", "")
        if not date_str:
            return None

        # Parse and format the date
        date = datetime.strptime(date_str, "%Y-%m-%d")
        date_formatted = date.strftime("%Y%m%d")

        vaccine_name = priority_item.get("vaccine", "Vaccination")
        dose = priority_item.get("dose", "")
        notes = priority_item.get("notes", "")

        # Build details
        details_parts = [f"Dose: {dose}"]
        if notes:
            details_parts.append(f"Notes: {notes}")
        details = "\n".join(details_parts)

        # Build URL parameters
        params = {
            "action": "TEMPLATE",
            "text": f"{vaccine_name} Vaccination - {dog_name}",
            "dates": f"{date_formatted}/{date_formatted}",
            "details": details,
        }

        base_url = "https://calendar.google.com/calendar/render"
        return f"{base_url}?{urlencode(params)}"

    except (ValueError, KeyError) as e:
        print(f"Error generating Google Calendar URL: {e}")
        return None
