"""
PDF generator for vaccination schedules.
Uses ReportLab for PDF generation.
"""
from io import BytesIO
from datetime import datetime
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT


# Brand colors
PRIMARY_COLOR = colors.HexColor("#006D9C")
SECONDARY_COLOR = colors.HexColor("#2AB57F")
ACCENT_COLOR = colors.HexColor("#FF9C3B")
DANGER_COLOR = colors.HexColor("#E53E3E")
NEUTRAL_DARK = colors.HexColor("#333F48")
NEUTRAL_LIGHT = colors.HexColor("#F7FAFC")
BORDER_COLOR = colors.HexColor("#E2E8F0")
NOTICE_BG = colors.HexColor("#FFF8E6")
NOTICE_BORDER = colors.HexColor("#F0E6D2")
NOTICE_HEADER = colors.HexColor("#8B6914")

# Important notice text (matches FAQ page)
IMPORTANT_NOTICE = """Vaccine schedules are generated based on AAHA (American Animal Hospital Association) and WSAVA (World Small Animal Veterinary Association) guidelines. This information is provided for educational purposes only and does not constitute veterinary advice. Always consult with a licensed veterinarian for decisions about your dog's health and vaccination schedule."""


def generate_schedule_pdf(
    dog_name: str,
    dog_info: dict,
    schedule: dict,
    history_analysis: Optional[str] = None
) -> bytes:
    """
    Generate a PDF document for the vaccination schedule.

    Args:
        dog_name: Name of the dog
        dog_info: Dog information dict
        schedule: Schedule dict with overdue, upcoming, future arrays
        history_analysis: Optional AI analysis

    Returns:
        PDF content as bytes
    """
    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm
    )

    # Get styles
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=PRIMARY_COLOR,
        spaceAfter=6,
        alignment=TA_CENTER,
    )

    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=14,
        textColor=NEUTRAL_DARK,
        spaceAfter=20,
        alignment=TA_CENTER,
    )

    section_header_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=PRIMARY_COLOR,
        spaceBefore=15,
        spaceAfter=10,
    )

    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        textColor=NEUTRAL_DARK,
        spaceAfter=6,
    )

    small_style = ParagraphStyle(
        'Small',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor("#5F6B76"),
    )

    # Table cell styles for text wrapping
    header_cell_style = ParagraphStyle(
        'HeaderCell',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor("#5F6B76"),
        fontName='Helvetica-Bold',
        leading=11,
    )

    cell_style = ParagraphStyle(
        'Cell',
        parent=styles['Normal'],
        fontSize=9,
        textColor=NEUTRAL_DARK,
        leading=11,
    )

    danger_cell_style = ParagraphStyle(
        'DangerCell',
        parent=styles['Normal'],
        fontSize=9,
        textColor=DANGER_COLOR,
        fontName='Helvetica-Bold',
        leading=11,
    )

    caution_cell_style = ParagraphStyle(
        'CautionCell',
        parent=styles['Normal'],
        fontSize=9,
        textColor=ACCENT_COLOR,
        fontName='Helvetica-Bold',
        leading=11,
    )

    # Build document elements
    elements = []

    # Title
    elements.append(Paragraph("Vaccination Schedule", title_style))
    elements.append(Paragraph(dog_name, subtitle_style))

    # Generation date
    elements.append(Paragraph(
        f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
        small_style
    ))
    elements.append(Spacer(1, 15))

    # Dog Information Section
    elements.append(Paragraph("Dog Information", section_header_style))

    dog_info_data = [
        ["Name:", dog_name],
    ]
    if dog_info.get("breed"):
        dog_info_data.append(["Breed:", dog_info["breed"]])
    dog_info_data.append(["Age:", f"{dog_info.get('age_weeks', 'N/A')} weeks ({dog_info.get('age_classification', '').title()})"])
    dog_info_data.append(["Birth Date:", dog_info.get("birth_date", "N/A")])

    dog_table = Table(dog_info_data, colWidths=[80, 300])
    dog_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor("#5F6B76")),
        ('TEXTCOLOR', (1, 0), (1, -1), NEUTRAL_DARK),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(dog_table)
    elements.append(Spacer(1, 20))

    # Horizontal line
    elements.append(HRFlowable(width="100%", thickness=1, color=BORDER_COLOR))
    elements.append(Spacer(1, 10))

    # Schedule sections
    schedule_sections = [
        ("Overdue Vaccines", "overdue", DANGER_COLOR),
        ("Upcoming (Next 30 Days)", "upcoming", ACCENT_COLOR),
        ("Future Vaccines", "future", SECONDARY_COLOR),
    ]

    for section_title, section_key, section_color in schedule_sections:
        items = schedule.get(section_key, [])
        if items:
            # Section header with colored indicator
            header_style = ParagraphStyle(
                f'Header_{section_key}',
                parent=section_header_style,
                textColor=section_color,
            )
            elements.append(Paragraph(f"● {section_title}", header_style))

            # Create table for vaccines with Paragraph objects for text wrapping
            # Choose cell style based on section (danger style for overdue)
            row_cell_style = danger_cell_style if section_key == "overdue" else cell_style

            table_data = [[
                Paragraph("Vaccine", header_cell_style),
                Paragraph("Dose", header_cell_style),
                Paragraph("Date", header_cell_style),
                Paragraph("Window", header_cell_style),
                Paragraph("Warnings", header_cell_style)
            ]]
            for item in items:
                # Format date range if available
                date_range = ""
                if item.get("date_range_start") and item.get("date_range_end"):
                    date_range = f"{item['date_range_start']} - {item['date_range_end']}"

                # Build warnings text from contraindication/warning fields
                # Shorten pipe-separated warnings to just condition names
                warning_text = ""
                raw_warning = item.get("warning", "") or ""
                if item.get("contraindicated"):
                    # Extract just condition names before the colon
                    parts = [p.split(":")[0].strip() for p in raw_warning.split("|") if p.strip()] if raw_warning else []
                    warning_text = "Contraindicated" + (f" ({', '.join(parts)})" if parts else "")
                elif raw_warning:
                    parts = [p.split(":")[0].strip() for p in raw_warning.split("|") if p.strip()]
                    warning_text = ", ".join(parts) if parts else raw_warning

                # Red for contraindications, orange for cautions
                if item.get("contraindicated"):
                    warning_style = danger_cell_style
                elif warning_text:
                    warning_style = caution_cell_style
                else:
                    warning_style = row_cell_style

                table_data.append([
                    Paragraph(item.get("vaccine", "Unknown"), row_cell_style),
                    Paragraph(item.get("dose", "N/A"), row_cell_style),
                    Paragraph(item.get("date", "N/A"), row_cell_style),
                    Paragraph(date_range or "-", row_cell_style),
                    Paragraph(warning_text or "-", warning_style)
                ])

            # Adjusted column widths for better text distribution
            vaccine_table = Table(table_data, colWidths=[120, 70, 70, 100, 120])

            # Base table style (font styling handled by Paragraph objects)
            table_style = [
                # Header row background
                ('BACKGROUND', (0, 0), (-1, 0), NEUTRAL_LIGHT),

                # Grid
                ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),

                # Left border color for data rows
                ('LINECOLOR', (0, 1), (0, -1), section_color),
                ('LINEWIDTH', (0, 1), (0, -1), 3),
            ]

            # For overdue items, add light red background
            if section_key == "overdue":
                table_style.append(
                    ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#FFF5F5"))
                )

            vaccine_table.setStyle(TableStyle(table_style))
            elements.append(vaccine_table)
            elements.append(Spacer(1, 15))

    # History Analysis Section
    if history_analysis:
        elements.append(HRFlowable(width="100%", thickness=1, color=BORDER_COLOR))
        elements.append(Spacer(1, 10))
        elements.append(Paragraph("History Analysis", section_header_style))

        analysis_style = ParagraphStyle(
            'Analysis',
            parent=normal_style,
            backColor=NEUTRAL_LIGHT,
            borderPadding=10,
            leftIndent=10,
            rightIndent=10,
        )
        elements.append(Paragraph(history_analysis, analysis_style))

    # Important Notice Section
    elements.append(Spacer(1, 20))
    elements.append(HRFlowable(width="100%", thickness=1, color=BORDER_COLOR))
    elements.append(Spacer(1, 10))

    notice_header_style = ParagraphStyle(
        'NoticeHeader',
        parent=section_header_style,
        textColor=NOTICE_HEADER,
        fontSize=12,
    )
    elements.append(Paragraph("Important Notice", notice_header_style))

    notice_style = ParagraphStyle(
        'Notice',
        parent=normal_style,
        backColor=NOTICE_BG,
        borderPadding=10,
        leftIndent=10,
        rightIndent=10,
        fontSize=9,
        leading=12,
    )
    elements.append(Paragraph(IMPORTANT_NOTICE, notice_style))

    # Footer
    elements.append(Spacer(1, 30))
    elements.append(HRFlowable(width="100%", thickness=1, color=BORDER_COLOR))

    footer_style = ParagraphStyle(
        'Footer',
        parent=small_style,
        alignment=TA_CENTER,
        spaceBefore=10,
    )
    elements.append(Paragraph(
        "Generated by Vaccine Scheduler • Please consult your veterinarian for medical advice",
        footer_style
    ))

    # Build PDF
    doc.build(elements)

    pdf_content = buffer.getvalue()
    buffer.close()

    return pdf_content
