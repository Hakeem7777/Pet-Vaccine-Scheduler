"""
Email service for sending vaccination schedules via Resend.
"""
import os
import base64
from datetime import datetime
from typing import List, Optional

import resend

from .pdf_generator import generate_schedule_pdf
from .ics_generator import generate_ics_content, generate_google_calendar_url


# Important notice text (matches FAQ page)
IMPORTANT_NOTICE = """Vaccine schedules are generated based on AAHA (American Animal Hospital Association) and WSAVA (World Small Animal Veterinary Association) guidelines. This information is provided for educational purposes only and does not constitute veterinary advice. Always consult with a licensed veterinarian for decisions about your dog's health and vaccination schedule."""


class EmailService:
    """Service for sending vaccination schedule emails via Resend."""

    def __init__(self):
        self.api_key = os.environ.get('RESEND_API_KEY')
        self.from_email = os.environ.get('RESEND_FROM_EMAIL', 'onboarding@resend.dev')

        if not self.api_key:
            raise ValueError("RESEND_API_KEY environment variable is not set")

        resend.api_key = self.api_key

    def send_schedule_email(
        self,
        to_emails: List[str],
        dog_name: str,
        dog_info: dict,
        schedule: dict,
        history_analysis: Optional[str] = None
    ) -> dict:
        """
        Send vaccination schedule email with PDF and ICS attachments.

        Args:
            to_emails: List of recipient email addresses
            dog_name: Name of the dog
            dog_info: Dog information dict (breed, age, birth_date, etc.)
            schedule: Schedule dict with overdue, upcoming, future arrays
            history_analysis: Optional AI analysis of vaccination history

        Returns:
            dict with success status and message
        """
        # Generate HTML content
        html_content = self._generate_email_html(
            dog_name, dog_info, schedule, history_analysis
        )

        # Generate plain text content
        plain_content = self._generate_email_text(
            dog_name, dog_info, schedule, history_analysis
        )

        # Generate PDF
        pdf_content = generate_schedule_pdf(dog_name, dog_info, schedule, history_analysis)

        # Generate ICS file
        ics_content = generate_ics_content(dog_name, schedule)

        # Prepare attachments
        attachments = [
            {
                "filename": f"{dog_name.replace(' ', '_')}_vaccination_schedule.pdf",
                "content": base64.b64encode(pdf_content).decode(),
                "content_type": "application/pdf"
            },
            {
                "filename": f"{dog_name.replace(' ', '_')}_vaccine_schedule.ics",
                "content": base64.b64encode(ics_content.encode()).decode(),
                "content_type": "text/calendar"
            }
        ]

        # Send email
        try:
            response = resend.Emails.send({
                "from": self.from_email,
                "to": to_emails,
                "subject": f"Vaccination Schedule for {dog_name}",
                "html": html_content,
                "text": plain_content,
                "attachments": attachments
            })

            return {
                'success': True,
                'message': f"Email sent successfully to {len(to_emails)} recipient(s)",
                'id': response.get('id')
            }
        except Exception as e:
            return {
                'success': False,
                'message': str(e),
                'status_code': 500
            }

    def _generate_email_html(
        self,
        dog_name: str,
        dog_info: dict,
        schedule: dict,
        history_analysis: Optional[str]
    ) -> str:
        """Generate HTML email content."""

        # Get Google Calendar URL for the first priority vaccine
        google_cal_url = generate_google_calendar_url(dog_name, schedule)

        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vaccination Schedule for {dog_name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f7fafc; color: #333f48;">
    <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <tr>
            <td style="background-color: #006D9C; padding: 30px 40px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                    Vaccination Schedule
                </h1>
                <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                    {dog_name}
                </p>
            </td>
        </tr>

        <!-- Dog Info -->
        <tr>
            <td style="padding: 30px 40px;">
                <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f7fafc; border-radius: 8px; padding: 20px;">
                    <tr>
                        <td style="padding: 15px;">
                            <h2 style="margin: 0 0 15px; color: #006D9C; font-size: 18px;">Dog Information</h2>
                            <table cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="padding: 5px 0; color: #5f6b76; width: 40%;">Name:</td>
                                    <td style="padding: 5px 0; font-weight: 600;">{dog_name}</td>
                                </tr>
                                {f'<tr><td style="padding: 5px 0; color: #5f6b76;">Breed:</td><td style="padding: 5px 0; font-weight: 600;">{dog_info.get("breed", "N/A")}</td></tr>' if dog_info.get("breed") else ''}
                                <tr>
                                    <td style="padding: 5px 0; color: #5f6b76;">Age:</td>
                                    <td style="padding: 5px 0; font-weight: 600;">{dog_info.get("age_weeks", "N/A")} weeks ({dog_info.get("age_classification", "").title()})</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 0; color: #5f6b76;">Birth Date:</td>
                                    <td style="padding: 5px 0; font-weight: 600;">{dog_info.get("birth_date", "N/A")}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- Schedule Sections -->
        <tr>
            <td style="padding: 0 40px 30px;">
                {self._generate_schedule_section_html("Overdue Vaccines", schedule.get("overdue", []), "#E53E3E", "#FFF5F5")}
                {self._generate_schedule_section_html("Upcoming (Next 30 Days)", schedule.get("upcoming", []), "#FF9C3B", "#FFFAF0")}
                {self._generate_schedule_section_html("Future Vaccines", schedule.get("future", []), "#2AB57F", "#F0FFF4")}
            </td>
        </tr>

        <!-- History Analysis -->
        {self._generate_history_analysis_html(history_analysis) if history_analysis else ''}

        <!-- Important Notice -->
        <tr>
            <td style="padding: 0 40px 30px;">
                <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFF8E6; border-radius: 8px; border: 1px solid #F0E6D2;">
                    <tr>
                        <td style="padding: 20px;">
                            <h3 style="margin: 0 0 10px; color: #8B6914; font-size: 14px; font-weight: 700;">Important Notice</h3>
                            <p style="margin: 0; color: #5f6b76; font-size: 13px; line-height: 1.6;">
                                {IMPORTANT_NOTICE}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- Footer -->
        <tr>
            <td style="background-color: #333f48; padding: 25px 40px; text-align: center;">
                <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 12px;">
                    This email was sent from Vaccine Scheduler.<br>
                    Generated on {datetime.now().strftime("%B %d, %Y at %I:%M %p")}
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
"""
        return html

    def _generate_schedule_section_html(
        self,
        title: str,
        items: list,
        border_color: str,
        bg_color: str
    ) -> str:
        """Generate HTML for a schedule section."""
        if not items:
            return ""

        items_html = ""
        for item in items:
            items_html += f"""
                <tr>
                    <td style="padding: 12px 15px; border-left: 4px solid {border_color}; background-color: {bg_color}; margin-bottom: 8px;">
                        <table cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td>
                                    <span style="font-weight: 700; color: #333f48;">{item.get("vaccine", "Unknown")}</span>
                                    <span style="margin-left: 10px; padding: 2px 8px; background-color: #ffffff; border-radius: 4px; font-size: 12px; color: #5f6b76;">
                                        {item.get("dose", "N/A")}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding-top: 5px; color: #5f6b76; font-size: 14px;">
                                    Due: {item.get("date", "N/A")}
                                    {f' &bull; {item.get("notes")}' if item.get("notes") else ''}
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
            """

        return f"""
            <h3 style="margin: 20px 0 10px; color: {border_color}; font-size: 16px;">{title}</h3>
            <table cellpadding="0" cellspacing="0" width="100%">
                {items_html}
            </table>
        """

    def _generate_history_analysis_html(self, analysis: str) -> str:
        """Generate HTML for history analysis section."""
        return f"""
        <tr>
            <td style="padding: 0 40px 30px;">
                <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f7fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <tr>
                        <td style="padding: 20px;">
                            <h3 style="margin: 0 0 10px; color: #006D9C; font-size: 16px;">History Analysis</h3>
                            <p style="margin: 0; color: #5f6b76; font-size: 14px; line-height: 1.6;">
                                {analysis}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        """

    def _generate_email_text(
        self,
        dog_name: str,
        dog_info: dict,
        schedule: dict,
        history_analysis: Optional[str]
    ) -> str:
        """Generate plain text email content."""
        lines = [
            f"VACCINATION SCHEDULE FOR {dog_name.upper()}",
            "=" * 50,
            "",
            "DOG INFORMATION",
            "-" * 20,
            f"Name: {dog_name}",
        ]

        if dog_info.get("breed"):
            lines.append(f"Breed: {dog_info['breed']}")
        lines.append(f"Age: {dog_info.get('age_weeks', 'N/A')} weeks ({dog_info.get('age_classification', '').title()})")
        lines.append(f"Birth Date: {dog_info.get('birth_date', 'N/A')}")
        lines.append("")

        # Schedule sections
        for section_name, section_key in [
            ("OVERDUE VACCINES", "overdue"),
            ("UPCOMING (Next 30 Days)", "upcoming"),
            ("FUTURE VACCINES", "future")
        ]:
            items = schedule.get(section_key, [])
            if items:
                lines.append(section_name)
                lines.append("-" * 20)
                for item in items:
                    lines.append(f"- {item.get('vaccine', 'Unknown')} ({item.get('dose', 'N/A')})")
                    lines.append(f"  Due: {item.get('date', 'N/A')}")
                    if item.get("notes"):
                        lines.append(f"  Notes: {item['notes']}")
                lines.append("")

        # History analysis
        if history_analysis:
            lines.append("HISTORY ANALYSIS")
            lines.append("-" * 20)
            lines.append(history_analysis)
            lines.append("")

        # Important notice
        lines.append("IMPORTANT NOTICE")
        lines.append("-" * 20)
        lines.append(IMPORTANT_NOTICE)
        lines.append("")

        lines.extend([
            "=" * 50,
            "Attachments:",
            "- PDF Schedule (for printing/saving)",
            "- ICS Calendar File (for Apple Calendar and other apps)",
            "",
            f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
            "Sent from Vaccine Scheduler"
        ])

        return "\n".join(lines)


# Create singleton instance
email_service = EmailService() if os.environ.get('RESEND_API_KEY') else None
