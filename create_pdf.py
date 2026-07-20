from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, ListFlowable, ListItem, HRFlowable,
                                KeepTogether, PageBreak)
import re

# ── Color Palette (FintLer brand) ──
BLACK = colors.HexColor("#000000")
BG_DARK = colors.HexColor("#0A0A0F")
CARD = colors.HexColor("#14141E")
TEAL = colors.HexColor("#00DFC1")
TEAL_DIM = colors.HexColor("#00AA99")
PURPLE = colors.HexColor("#BB86FC")
WHITE = colors.HexColor("#FFFFFF")
GRAY = colors.HexColor("#A0A0AD")
GOLD = colors.HexColor("#FFD700")
ERROR = colors.HexColor("#FF6B6B")
BORDER = colors.HexColor("#222230")

# ── Styles ──
styles = getSampleStyleSheet()

style_title = ParagraphStyle('TitleX', parent=styles['Title'], fontName='Helvetica-Bold',
                              fontSize=26, textColor=TEAL, spaceAfter=4, leading=30)
style_subtitle = ParagraphStyle('SubX', parent=styles['Normal'], fontName='Helvetica',
                                 fontSize=13, textColor=GRAY, spaceAfter=10, leading=16)
style_h1 = ParagraphStyle('H1X', parent=styles['Heading1'], fontName='Helvetica-Bold',
                          fontSize=17, textColor=WHITE, spaceBefore=14, spaceAfter=8, leading=20)
style_h2 = ParagraphStyle('H2X', parent=styles['Heading2'], fontName='Helvetica-Bold',
                          fontSize=13.5, textColor=TEAL, spaceBefore=10, spaceAfter=5, leading=16)
style_body = ParagraphStyle('BodyX', parent=styles['Normal'], fontName='Helvetica',
                            fontSize=10.5, textColor=GRAY, spaceAfter=6, leading=15,
                            alignment=TA_JUSTIFY)
style_bullet = ParagraphStyle('BulletX', parent=style_body, leftIndent=6, spaceAfter=3)
style_quote = ParagraphStyle('QuoteX', parent=styles['Normal'], fontName='Helvetica-Oblique',
                             fontSize=12, textColor=WHITE, spaceAfter=8, leading=17,
                             leftIndent=14, borderColor=TEAL, borderWidth=0)
style_th = ParagraphStyle('THX', fontName='Helvetica-Bold', fontSize=9.5, textColor=WHITE, leading=12)
style_td = ParagraphStyle('TDX', fontName='Helvetica', fontSize=9, textColor=GRAY, leading=12)
style_td_b = ParagraphStyle('TDXB', fontName='Helvetica-Bold', fontSize=9, textColor=WHITE, leading=12)
style_code = ParagraphStyle('CodeX', fontName='Courier', fontSize=8.5, textColor=TEAL, leading=12,
                            backColor=CARD, borderPadding=6, leftIndent=6)

def md_inline(text):
    # Bold
    text = re.sub(r'\*\*(.+?)\*\*', r'<font color="#FFFFFF"><b>\1</b></font>', text)
    # Inline code
    text = re.sub(r'`(.+?)`', r'<font face="Courier" color="#00DFC1">\1</font>', text)
    return text

flow = []

# ── Title block ──
flow.append(Paragraph("FintLer — Product Analysis &amp; Market Context", style_title))
flow.append(Paragraph("Why a behavioral financial clarity engine beats budgeting for India's UPI generation", style_subtitle))
flow.append(HRFlowable(width="100%", thickness=1.5, color=TEAL, spaceAfter=10))

with open(r"C:\Product Sprint 2\PRODUCT_ANALYSIS.md", encoding="utf-8") as f:
    lines = f.readlines()

i = 0
n = len(lines)
current_table = []
in_code = False
code_lines = []

def flush_table():
    global current_table
    if not current_table:
        return
    header = current_table[0]
    rows = current_table[1:]
    data = []
    data.append([Paragraph(c, style_th) for c in header])
    for r in rows:
        cells = []
        for c in r:
            if c.strip().startswith("|") or c.strip() == "—":
                cells.append(Paragraph(c, style_td_b))
            else:
                cells.append(Paragraph(md_inline(c), style_td))
        data.append(cells)
    t = Table(data, colWidths=[4.2*cm, 5.5*cm, 6.3*cm][:len(header)])
    ts = [
        ('BACKGROUND', (0,0), (-1,0), CARD),
        ('LINEBELOW', (0,0), (-1,0), 1, TEAL),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor("#0E0E16"), colors.HexColor("#12121B")]),
    ]
    t.setStyle(TableStyle(ts))
    flow.append(t)
    flow.append(Spacer(1, 8))
    current_table = []

while i < n:
    line = lines[i].rstrip("\n")
    stripped = line.strip()

    # Code block
    if stripped.startswith("```"):
        if not in_code:
            in_code = True
            code_lines = []
        else:
            in_code = False
            code_txt = "<br/>".join(c.replace(" ", "&nbsp;") for c in code_lines)
            flow.append(Paragraph(code_txt, style_code))
            flow.append(Spacer(1, 8))
        i += 1
        continue
    if in_code:
        code_lines.append(line)
        i += 1
        continue

    # Headings
    if stripped.startswith("# "):
        flow.append(Paragraph(md_inline(stripped[2:]), style_title))
        i += 1; continue
    if stripped.startswith("## "):
        flush_table()
        flow.append(Paragraph(md_inline(stripped[3:]), style_h1))
        flow.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=6))
        i += 1; continue
    if stripped.startswith("### "):
        flush_table()
        flow.append(Paragraph(md_inline(stripped[4:]), style_h2))
        i += 1; continue

    # Blockquote
    if stripped.startswith(">"):
        flush_table()
        q = stripped[1:].strip()
        flow.append(Paragraph("“" + md_inline(q) + "”", style_quote))
        flow.append(HRFlowable(width="30%", thickness=1, color=TEAL, spaceAfter=8, hAlign='LEFT'))
        i += 1; continue

    # Table row
    if stripped.startswith("|"):
        cells = [c.strip() for c in stripped.strip("|").split("|")]
        # separator row
        if all(set(c) <= set("-: ") for c in cells) and any("-" in c for c in cells):
            i += 1; continue
        current_table.append(cells)
        i += 1; continue

    # Bullet list
    if stripped.startswith("- "):
        flush_table()
        item = md_inline(stripped[2:])
        flow.append(Paragraph("▸&nbsp;&nbsp;" + item, style_bullet))
        i += 1; continue

    # Ordered list
    m = re.match(r"^\d+\.\s+(.*)", stripped)
    if m:
        flush_table()
        item = md_inline(m.group(1))
        flow.append(Paragraph(f"<font color='#00DFC1'><b>{stripped.split('.')[0]}.</b></font>&nbsp;&nbsp;" + item, style_bullet))
        i += 1; continue

    # Empty line
    if stripped == "":
        flush_table()
        flow.append(Spacer(1, 4))
        i += 1; continue

    # Plain paragraph
    flush_table()
    flow.append(Paragraph(md_inline(stripped), style_body))
    i += 1

flush_table()

# ── Build with dark background ──
def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BG_DARK)
    canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
    # Footer
    canvas.setFillColor(GRAY)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(2*cm, 1.2*cm, "FintLer — Product Analysis & Market Context")
    canvas.drawRightString(A4[0]-2*cm, 1.2*cm, "Page %d" % doc.page)
    canvas.setStrokeColor(BORDER)
    canvas.line(2*cm, 1.6*cm, A4[0]-2*cm, 1.6*cm)
    canvas.restoreState()

doc = SimpleDocTemplate(
    r"C:\Product Sprint 2\FintLer_Product_Analysis.pdf",
    pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm, topMargin=1.8*cm, bottomMargin=2*cm,
    title="FintLer — Product Analysis & Market Context",
    author="FintLer",
)

# We need dark text container trick: reportlab page bg handled in canvas,
# but the default page has white drawn by doc? No — SimpleDocTemplate does not draw bg.
# We draw it in on_page. Good.

doc.build(flow, onFirstPage=on_page, onLaterPages=on_page)
print("PDF saved.")
