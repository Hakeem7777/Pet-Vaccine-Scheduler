"""
PDF generator for vaccination schedules.
Uses ReportLab for PDF generation with a medical/clinical design.
"""
import os
from io import BytesIO
from datetime import datetime
from typing import Optional, List

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
    KeepTogether, Image
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# Paths
ASSETS_DIR = os.path.join(os.path.dirname(__file__), 'assets')
LOGO_PATH = os.path.join(ASSETS_DIR, 'logoIconText.png')


# Brand / medical palette
PRIMARY_COLOR = colors.HexColor("#006D9C")
SECONDARY_COLOR = colors.HexColor("#2AB57F")
ACCENT_COLOR = colors.HexColor("#FF9C3B")
DANGER_COLOR = colors.HexColor("#D92D20")
UPCOMING_COLOR = colors.HexColor("#2680C2")
NEUTRAL_DARK = colors.HexColor("#333F48")
NEUTRAL_LIGHT = colors.HexColor("#F7FAFC")
BORDER_COLOR = colors.HexColor("#E2E8F0")
MUTED_TEXT = colors.HexColor("#5F6B76")
NOTICE_BG = colors.HexColor("#FFF8E6")
NOTICE_HEADER = colors.HexColor("#8B6914")
WHITE = colors.HexColor("#FFFFFF")
LIGHT_RED_BG = colors.HexColor("#FFF5F5")
REF_GUIDE_BG = colors.HexColor("#F0F7FA")

# Important notice text
IMPORTANT_NOTICE = (
    "Vaccine schedules are generated based on AAHA (American Animal Hospital "
    "Association) and WSAVA (World Small Animal Veterinary Association) guidelines. "
    "This information is provided for educational purposes only and does not "
    "constitute veterinary advice. Always consult with a licensed veterinarian "
    "for decisions about your dog's health and vaccination schedule."
)

PAGE_WIDTH, PAGE_HEIGHT = A4
CONTENT_WIDTH = PAGE_WIDTH - 40 * mm  # 20mm margins each side


def _build_styles():
    """Create all paragraph styles for the PDF."""
    styles = getSampleStyleSheet()

    s = {}

    # Document title — serif for medical authority
    s['title'] = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Times-Bold',
        fontSize=22,
        textColor=PRIMARY_COLOR,
        spaceAfter=4,
        alignment=TA_CENTER,
    )

    # Subtitle (dog name)
    s['subtitle'] = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        textColor=NEUTRAL_DARK,
        spaceAfter=2,
        alignment=TA_CENTER,
    )

    # Small muted text (dates, footers)
    s['small'] = ParagraphStyle(
        'SmallMuted',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        textColor=MUTED_TEXT,
        alignment=TA_CENTER,
    )

    # Section headers — serif, clinical
    s['section'] = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Times-Bold',
        fontSize=13,
        textColor=PRIMARY_COLOR,
        spaceBefore=14,
        spaceAfter=8,
    )

    # Sub-section headers (overdue, upcoming, future)
    s['subsection'] = ParagraphStyle(
        'SubSection',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=11,
        spaceBefore=10,
        spaceAfter=6,
    )

    # Normal body text
    s['body'] = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=NEUTRAL_DARK,
        leading=12,
        spaceAfter=4,
    )

    # Table header cell
    s['th'] = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        textColor=MUTED_TEXT,
        leading=10,
    )

    # Table cell — normal
    s['td'] = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        textColor=NEUTRAL_DARK,
        leading=11,
    )

    # Table cell — danger (overdue / contraindicated)
    s['td_danger'] = ParagraphStyle(
        'TableCellDanger',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        textColor=DANGER_COLOR,
        leading=11,
    )

    # Table cell — caution (warnings)
    s['td_caution'] = ParagraphStyle(
        'TableCellCaution',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        textColor=ACCENT_COLOR,
        leading=11,
    )

    # Patient info label
    s['info_label'] = ParagraphStyle(
        'InfoLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        textColor=MUTED_TEXT,
        leading=10,
    )

    # Patient info value
    s['info_value'] = ParagraphStyle(
        'InfoValue',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=NEUTRAL_DARK,
        leading=11,
    )

    # Reference guide — vaccine name
    s['ref_name'] = ParagraphStyle(
        'RefVaccineName',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=NEUTRAL_DARK,
        leading=12,
        spaceBefore=6,
    )

    # Reference guide — description
    s['ref_desc'] = ParagraphStyle(
        'RefVaccineDesc',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        textColor=MUTED_TEXT,
        leading=11,
        spaceAfter=4,
        leftIndent=12,
    )

    # Notice
    s['notice_header'] = ParagraphStyle(
        'NoticeHeader',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=NOTICE_HEADER,
        spaceAfter=4,
    )

    s['notice'] = ParagraphStyle(
        'NoticeBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        textColor=NOTICE_HEADER,
        leading=11,
        backColor=NOTICE_BG,
        borderPadding=8,
        leftIndent=8,
        rightIndent=8,
    )

    # Footer
    s['footer'] = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        textColor=MUTED_TEXT,
        alignment=TA_CENTER,
        spaceBefore=8,
    )

    return s


def _build_patient_info_box(dog_name, dog_info, s):
    """Build the patient information box at the top."""
    # 2-column layout for patient info
    age_text = ""
    age_weeks = dog_info.get('age_weeks')
    age_class = dog_info.get('age_classification', '')
    if age_weeks:
        age_text = f"{age_weeks} weeks"
        if age_class:
            age_text += f" ({age_class.title()})"

    info_data = [
        [
            Paragraph("Patient", s['info_label']),
            Paragraph(dog_name, s['info_value']),
            Paragraph("Breed", s['info_label']),
            Paragraph(dog_info.get('breed', 'N/A'), s['info_value']),
        ],
        [
            Paragraph("Date of Birth", s['info_label']),
            Paragraph(dog_info.get('birth_date', 'N/A'), s['info_value']),
            Paragraph("Age", s['info_label']),
            Paragraph(age_text or 'N/A', s['info_value']),
        ],
    ]

    col_w = CONTENT_WIDTH / 4
    info_table = Table(info_data, colWidths=[col_w * 0.6, col_w * 1.4, col_w * 0.6, col_w * 1.4])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('BOX', (0, 0), (-1, -1), 0.75, BORDER_COLOR),
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (-1, -1), NEUTRAL_LIGHT),
    ]))

    return info_table


def _build_warning_text(item):
    """Extract and format warning text from a schedule item."""
    raw_warning = item.get("warning", "") or ""
    if item.get("contraindicated"):
        parts = [p.split(":")[0].strip() for p in raw_warning.split("|") if p.strip()] if raw_warning else []
        return "Contraindicated" + (f" ({', '.join(parts)})" if parts else ""), "danger"
    elif raw_warning:
        parts = [p.split(":")[0].strip() for p in raw_warning.split("|") if p.strip()]
        text = ", ".join(parts) if parts else raw_warning
        return text, "caution"
    return "-", "normal"


def _build_schedule_table(items, section_color, s, is_overdue=False):
    """Build a vaccine schedule table for a section."""
    row_style = s['td_danger'] if is_overdue else s['td']

    header_row = [
        Paragraph("Vaccine", s['th']),
        Paragraph("Dose", s['th']),
        Paragraph("Date", s['th']),
        Paragraph("Warnings", s['th']),
    ]
    table_data = [header_row]

    for item in items:
        warning_text, severity = _build_warning_text(item)

        if severity == "danger":
            warn_style = s['td_danger']
        elif severity == "caution":
            warn_style = s['td_caution']
        else:
            warn_style = row_style

        # Add overdue/upcoming badge text
        date_display = item.get("date", "N/A")
        if is_overdue and item.get("days_overdue"):
            date_display += f"  ({item['days_overdue']}d overdue)"
        elif not is_overdue and item.get("days_until") is not None:
            days = item['days_until']
            if days == 0:
                date_display += "  (today)"
            elif days <= 30:
                date_display += f"  (in {days}d)"

        table_data.append([
            Paragraph(item.get("vaccine", "Unknown"), row_style),
            Paragraph(item.get("dose", "N/A"), row_style),
            Paragraph(date_display, row_style),
            Paragraph(warning_text, warn_style),
        ])

    col_widths = [CONTENT_WIDTH * 0.32, CONTENT_WIDTH * 0.15, CONTENT_WIDTH * 0.28, CONTENT_WIDTH * 0.25]
    table = Table(table_data, colWidths=col_widths)

    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), NEUTRAL_LIGHT),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        # Colored left border for data rows
        ('LINECOLOR', (0, 1), (0, -1), section_color),
        ('LINEWIDTH', (0, 1), (0, -1), 2.5),
    ]

    if is_overdue:
        style_cmds.append(('BACKGROUND', (0, 1), (-1, -1), LIGHT_RED_BG))

    table.setStyle(TableStyle(style_cmds))
    return table


def _build_history_table(vaccination_history, s):
    """Build the vaccination history table."""
    header_row = [
        Paragraph("Vaccine", s['th']),
        Paragraph("Date Administered", s['th']),
        Paragraph("Dose #", s['th']),
        Paragraph("Administered By", s['th']),
        Paragraph("Notes", s['th']),
    ]
    table_data = [header_row]

    for record in vaccination_history:
        date_val = record.get('date_administered', 'N/A')
        if hasattr(date_val, 'strftime'):
            date_val = date_val.strftime('%b %d, %Y')

        table_data.append([
            Paragraph(record.get('vaccine_name', 'Unknown'), s['td']),
            Paragraph(str(date_val), s['td']),
            Paragraph(str(record.get('dose_number') or '-'), s['td']),
            Paragraph(record.get('administered_by', '-') or '-', s['td']),
            Paragraph(record.get('notes', '-') or '-', s['td']),
        ])

    col_widths = [
        CONTENT_WIDTH * 0.28,
        CONTENT_WIDTH * 0.18,
        CONTENT_WIDTH * 0.10,
        CONTENT_WIDTH * 0.20,
        CONTENT_WIDTH * 0.24,
    ]
    table = Table(table_data, colWidths=col_widths)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NEUTRAL_LIGHT),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, NEUTRAL_LIGHT]),
    ]))
    return table


def _build_reference_guide(schedule, s):
    """Build the vaccine reference guide from schedule descriptions."""
    seen = {}
    for section_key in ('overdue', 'upcoming', 'future'):
        for item in schedule.get(section_key, []):
            vid = item.get('vaccine_id')
            if vid and vid not in seen and item.get('description'):
                seen[vid] = {
                    'name': item.get('vaccine', 'Unknown'),
                    'description': item['description'],
                }

    if not seen:
        return []

    elements = []
    count = 1
    for vid, info in seen.items():
        elements.append(
            Paragraph(f"{count}. {info['name']}", s['ref_name'])
        )
        elements.append(
            Paragraph(info['description'], s['ref_desc'])
        )
        count += 1

    return elements


def generate_schedule_pdf(
    dog_name: str,
    dog_info: dict,
    schedule: dict,
    history_analysis: Optional[str] = None,
    vaccination_history: Optional[List[dict]] = None,
) -> bytes:
    """
    Generate a medical-style PDF document for the vaccination schedule.

    Args:
        dog_name: Name of the dog
        dog_info: Dog information dict (breed, age_weeks, age_classification, birth_date)
        schedule: Schedule dict with overdue, upcoming, future arrays
        history_analysis: Optional AI analysis of vaccination history
        vaccination_history: Optional list of past vaccination records

    Returns:
        PDF content as bytes
    """
    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )

    s = _build_styles()
    elements = []

    # ── Header ──────────────────────────────────────────────────────────
    # Logo at top
    if os.path.exists(LOGO_PATH):
        logo = Image(LOGO_PATH, width=130, height=43)
        logo.hAlign = 'CENTER'
        elements.append(logo)
        elements.append(Spacer(1, 8))

    # Thin colored line at top
    elements.append(HRFlowable(width="100%", thickness=2, color=PRIMARY_COLOR))
    elements.append(Spacer(1, 10))

    elements.append(Paragraph("Vaccination Record", s['title']))
    elements.append(Paragraph(dog_name, s['subtitle']))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph(
        f"Generated {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
        s['small']
    ))
    elements.append(Spacer(1, 12))

    # ── Patient Information Box ─────────────────────────────────────────
    elements.append(_build_patient_info_box(dog_name, dog_info, s))
    elements.append(Spacer(1, 16))

    # ── Vaccine Schedule ────────────────────────────────────────────────
    elements.append(Paragraph("Vaccine Schedule", s['section']))

    schedule_sections = [
        ("Overdue Vaccines", "overdue", DANGER_COLOR, True),
        ("Upcoming (Next 30 Days)", "upcoming", UPCOMING_COLOR, False),
        ("Future Vaccines", "future", SECONDARY_COLOR, False),
    ]

    has_schedule_items = False
    for section_title, section_key, section_color, is_overdue in schedule_sections:
        items = schedule.get(section_key, [])
        if not items:
            continue
        has_schedule_items = True

        header_style = ParagraphStyle(
            f'Sub_{section_key}',
            parent=s['subsection'],
            textColor=section_color,
        )
        elements.append(Paragraph(f"\u25cf {section_title}", header_style))
        elements.append(
            _build_schedule_table(items, section_color, s, is_overdue=is_overdue)
        )
        elements.append(Spacer(1, 10))

    if not has_schedule_items:
        elements.append(Paragraph(
            "No vaccines currently scheduled.",
            s['body']
        ))
        elements.append(Spacer(1, 10))

    # ── History Analysis ────────────────────────────────────────────────
    if history_analysis:
        elements.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR))
        elements.append(Spacer(1, 8))
        elements.append(Paragraph("History Analysis", s['section']))
        analysis_style = ParagraphStyle(
            'AnalysisBox',
            parent=s['body'],
            backColor=NEUTRAL_LIGHT,
            borderPadding=8,
            leftIndent=8,
            rightIndent=8,
        )
        elements.append(Paragraph(history_analysis, analysis_style))
        elements.append(Spacer(1, 10))

    # ── Vaccination History ─────────────────────────────────────────────
    elements.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR))
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("Vaccination History", s['section']))

    if vaccination_history:
        elements.append(_build_history_table(vaccination_history, s))
    else:
        elements.append(Paragraph(
            "No vaccination records on file.",
            s['body']
        ))
    elements.append(Spacer(1, 14))

    # ── Vaccine Reference Guide ─────────────────────────────────────────
    ref_elements = _build_reference_guide(schedule, s)
    if ref_elements:
        elements.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR))
        elements.append(Spacer(1, 8))
        elements.append(Paragraph("Vaccine Reference Guide", s['section']))
        elements.extend(ref_elements)
        elements.append(Spacer(1, 14))

    # ── Important Notice ────────────────────────────────────────────────
    elements.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR))
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("Important Notice", s['notice_header']))
    elements.append(Paragraph(IMPORTANT_NOTICE, s['notice']))
    elements.append(Spacer(1, 16))

    # ── Footer ──────────────────────────────────────────────────────────
    support_email = os.environ.get('SUPPORT_EMAIL', 'support@petvaxcalendar.com')
    elements.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY_COLOR))
    elements.append(Paragraph(
        "Generated by PetVax Calendar \u2022 Please consult your veterinarian for medical advice",
        s['footer']
    ))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph(
        f"For further support, contact <a href='mailto:{support_email}'>{support_email}</a>",
        s['footer']
    ))

    # Build PDF
    doc.build(elements)
    pdf_content = buffer.getvalue()
    buffer.close()
    return pdf_content
