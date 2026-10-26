import os
from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)

def generate_pdf_report(analysis_data, user_name="Resident / Student", tariff_name="Standard Domestic"):
    """
    Generates a clean, professional PDF Energy Audit and Analysis Report.
    Returns a BytesIO buffer.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    primary_color = colors.HexColor('#0F766E') # Emerald / Teal
    secondary_color = colors.HexColor('#1E293B') # Slate dark
    accent_color = colors.HexColor('#059669') # Vibrant green
    gray_bg = colors.HexColor('#F8FAFC')
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=primary_color,
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=12
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=secondary_color,
        spaceBefore=12,
        spaceAfter=6
    )

    body_text = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=secondary_color
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=1 # Center
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=secondary_color
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=secondary_color
    )

    story = []

    # Title Banner
    story.append(Paragraph("Smart Electricity Bill & Energy Waste Analyzer", title_style))
    story.append(Paragraph(f"Comprehensive Energy Audit & Conservation Report • Generated on {datetime.now().strftime('%d %B %Y, %I:%M %p')}", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceBefore=0, spaceAfter=12))

    # Executive Summary Card
    bill = analysis_data['bill']
    total_kwh = analysis_data['total_kwh']
    total_cost = bill['total_amount']
    top_app = analysis_data.get('top_consumer')
    top_name = top_app['name'] if top_app else 'N/A'
    top_pct = f"{top_app['percentage']}%" if top_app else 'N/A'

    summary_data = [
        [
            Paragraph("<b>Target Profile:</b> " + user_name, body_text),
            Paragraph("<b>Billing Tariff:</b> " + tariff_name, body_text)
        ],
        [
            Paragraph(f"<b>Total Energy Consumption:</b> <font color='#0F766E'><b>{total_kwh} kWh / month</b></font>", body_text),
            Paragraph(f"<b>Estimated Monthly Bill:</b> <font color='#0F766E'><b>₹{total_cost:,.2f}</b></font>", body_text)
        ],
        [
            Paragraph(f"<b>Effective Unit Cost:</b> ₹{bill['effective_rate']:.2f} / kWh", body_text),
            Paragraph(f"<b>Top Energy Hog:</b> {top_name} ({top_pct} of bill)", body_text)
        ],
        [
            Paragraph(f"<b>Estimated Carbon Footprint:</b> {analysis_data['co2_total_kg']} kg CO₂e / month", body_text),
            Paragraph(f"<b>Annual Tree Offset Required:</b> {analysis_data['trees_needed_annual']} mature trees", body_text)
        ]
    ]

    t_summary = Table(summary_data, colWidths=[270, 270])
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F0FDFA')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#99F6E4')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CCFBF1')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_summary)
    story.append(Spacer(1, 14))

    # Bill Calculation Breakdown
    story.append(Paragraph("1. Monthly Bill Calculation Breakdown", section_heading))
    bill_data = [
        [Paragraph("Component", table_header), Paragraph("Details / Rate", table_header), Paragraph("Amount (₹)", table_header)],
        [Paragraph("Base Energy Charge", table_cell), Paragraph(f"{total_kwh} units @ tiered/applicable rate", table_cell), Paragraph(f"₹{bill['energy_charge']:.2f}", table_cell_bold)],
        [Paragraph("Fixed Utility Charge", table_cell), Paragraph("Sanctioned load / connection fee", table_cell), Paragraph(f"₹{bill['fixed_charge']:.2f}", table_cell_bold)],
        [Paragraph(f"Electricity Duty & Taxes ({bill['tax_percent']}%)", table_cell), Paragraph("State statutory duty on energy + fixed", table_cell), Paragraph(f"₹{bill['tax_amount']:.2f}", table_cell_bold)],
        [Paragraph("<b>Total Monthly Payable</b>", table_cell_bold), Paragraph("<b>Final Net Amount</b>", table_cell_bold), Paragraph(f"<b>₹{bill['total_amount']:.2f}</b>", table_cell_bold)]
    ]
    t_bill = Table(bill_data, colWidths=[180, 220, 140])
    t_bill.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_bill)
    story.append(Spacer(1, 14))

    # Appliance-Wise Consumption Table
    story.append(Paragraph("2. Appliance-Wise Energy Consumption & Ranking", section_heading))
    app_rows = [
        [
            Paragraph("Rank", table_header),
            Paragraph("Appliance", table_header),
            Paragraph("Category", table_header),
            Paragraph("Power (W)", table_header),
            Paragraph("Qty", table_header),
            Paragraph("Hours/Day", table_header),
            Paragraph("Monthly kWh", table_header),
            Paragraph("Share (%)", table_header),
            Paragraph("Monthly Cost", table_header)
        ]
    ]

    for item in analysis_data['appliances']:
        app_rows.append([
            Paragraph(str(item['rank']), table_cell),
            Paragraph(item['name'], table_cell_bold),
            Paragraph(item['category'], table_cell),
            Paragraph(f"{item['power_watts']} W", table_cell),
            Paragraph(str(item['quantity']), table_cell),
            Paragraph(f"{item['hours_per_day']} h", table_cell),
            Paragraph(f"{item['total_kwh']} kWh", table_cell_bold),
            Paragraph(f"{item['percentage']}%", table_cell),
            Paragraph(f"₹{item['estimated_cost']:.2f}", table_cell)
        ])

    t_apps = Table(app_rows, colWidths=[32, 120, 68, 55, 30, 55, 65, 50, 65])
    t_apps.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), secondary_color),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, gray_bg]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_apps)
    story.append(Spacer(1, 14))

    # Actionable Energy Waste & Savings Recommendations
    story.append(Paragraph("3. Energy Waste Detection & Savings Recommendations", section_heading))
    rec_rows = [
        [
            Paragraph("Category", table_header),
            Paragraph("Recommended Conservation Action", table_header),
            Paragraph("Monthly kWh Saved", table_header),
            Paragraph("Monthly ₹ Saved", table_header),
            Paragraph("Annual ₹ Saved", table_header)
        ]
    ]

    tips = analysis_data.get('tips', [])
    total_saved_cost_month = sum(t.get('saved_cost_month', 0) for t in tips)
    total_saved_cost_year = sum(t.get('saved_cost_year', 0) for t in tips)

    for tip in tips:
        rec_rows.append([
            Paragraph(tip.get('category', 'General'), table_cell_bold),
            Paragraph(f"<b>{tip.get('title')}</b><br/>{tip.get('action')}", table_cell),
            Paragraph(f"{tip.get('saved_kwh_month', 0)} kWh", table_cell),
            Paragraph(f"₹{tip.get('saved_cost_month', 0):,.2f}", table_cell_bold),
            Paragraph(f"₹{tip.get('saved_cost_year', 0):,.2f}", table_cell_bold)
        ])

    # Total savings summary row
    rec_rows.append([
        Paragraph("<b>Total Potential</b>", table_cell_bold),
        Paragraph("<b>Accumulated Savings from All Recommended Actions</b>", table_cell_bold),
        Paragraph("-", table_cell),
        Paragraph(f"<b>₹{total_saved_cost_month:,.2f}</b>", table_cell_bold),
        Paragraph(f"<b>₹{total_saved_cost_year:,.2f}</b>", table_cell_bold)
    ])

    t_recs = Table(rec_rows, colWidths=[70, 240, 75, 75, 80])
    t_recs.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), accent_color),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#DCFCE7')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_recs)
    story.append(Spacer(1, 14))

    # Viva Voce / Calculation Reference Footer
    story.append(Paragraph("4. Mathematical Formulation & Viva Reference", section_heading))
    formula_text = (
        "<b>Appliance Consumption Formula:</b> Energy (kWh) = (Power in Watts × Daily Hours × Days in Month × Quantity) ÷ 1,000<br/>"
        "<b>Total Energy:</b> E_total = ∑ E_i | <b>Estimated Energy Cost:</b> Energy (kWh) × Tariff Rate (₹/kWh)<br/>"
        "<b>Carbon Footprint:</b> Energy (kWh) × 0.82 kg CO₂e / kWh | <b>Tree Equivalent:</b> Total CO₂ ÷ 21 kg/tree/year."
    )
    story.append(Paragraph(formula_text, body_text))

    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer
