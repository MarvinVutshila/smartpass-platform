"""
pdf_ticket.py – Premium event ticket with branded QR code.
QR code contains the full verification URL.
No fallback text – just the QR code.
"""

import io
import qrcode
from PIL import Image, ImageDraw
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF

# ─── Premium colour palette ──────────────────────────────────────────
PINK        = HexColor('#ec4899')
PINK_GLOW   = HexColor('#f472b6')
BLUE        = HexColor('#3b82f6')
BLUE_GLOW   = HexColor('#60a5fa')
PURPLE      = HexColor('#7c3aed')
PURPLE_DARK = HexColor('#5b21b6')
BG_DARK     = HexColor('#0b0a14')
PANEL_DARK  = HexColor('#0f0e1a')
BG_CARD     = HexColor('#0d0b18')
TEXT_WHITE  = white
TEXT_MUTED  = HexColor('#a1a1aa')
TEXT_LIGHT  = HexColor('#e4e4e7')
LINE_GREY   = HexColor('#2a2a3a')
GOLD        = HexColor('#fbbf24')

# ─── Page geometry ──────────────────────────────────────────────────
PAGE_W, PAGE_H = 260 * mm, 150 * mm
STUB_SPLIT     = PAGE_W * 0.65
NOTCH_R        = 4.5 * mm
CARD_MARGIN    = 3.5 * mm

# ─── Helper: generate QR code with SmartPass logo in centre ──────────
def make_qr_with_logo(data: str, size_px: int = 400, logo_size_ratio: float = 0.25) -> ImageReader:
    """
    Generate a QR code with a white circle and the SmartPass "S" logo in the centre.
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert('RGB')

    width, height = img.size
    centre_x = width // 2
    centre_y = height // 2
    logo_size = int(width * logo_size_ratio)
    radius = logo_size // 2 + 4

    draw = ImageDraw.Draw(img)
    draw.ellipse(
        (centre_x - radius, centre_y - radius, centre_x + radius, centre_y + radius),
        fill="white"
    )
    draw.ellipse(
        (centre_x - logo_size//2, centre_y - logo_size//2,
         centre_x + logo_size//2, centre_y + logo_size//2),
        fill="#7c3aed"
    )
    try:
        from PIL import ImageFont
        font = ImageFont.load_default()
        draw.text((centre_x - 5, centre_y - 7), "S", fill="white", font=font)
    except:
        draw.ellipse(
            (centre_x - logo_size//4, centre_y - logo_size//4,
             centre_x + logo_size//4, centre_y + logo_size//4),
            fill="white"
        )

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return ImageReader(buf)

# ─── Other helpers (unchanged) ──────────────────────────────────────────
def draw_gradient_rect(c, x, y, w, h, color_left, color_right, steps=80, vertical=False):
    r1, g1, b1 = color_left.red, color_left.green, color_left.blue
    r2, g2, b2 = color_right.red, color_right.green, color_right.blue
    step = (h if vertical else w) / steps
    for i in range(steps):
        t = i / (steps - 1)
        c.setFillColorRGB(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t)
        if vertical:
            c.rect(x, y + i * step, w, step + 0.6, fill=1, stroke=0)
        else:
            c.rect(x + i * step, y, step + 0.6, h, fill=1, stroke=0)

def draw_glow(c, cx, cy, radius, color, alpha_layers=15):
    r, g, b = color.red, color.green, color.blue
    c.saveState()
    for i in range(alpha_layers, 0, -1):
        frac = i / alpha_layers
        c.setFillColorRGB(r, g, b, alpha=0.06 * frac)
        c.circle(cx, cy, radius * frac, fill=1, stroke=0)
    c.restoreState()

def rounded_rect(c, x, y, w, h, r, fill_color=None, stroke_color=None, lw=1, alpha=1.0):
    c.saveState()
    if fill_color:
        c.setFillColorRGB(fill_color.red, fill_color.green, fill_color.blue, alpha=alpha)
    if stroke_color:
        c.setStrokeColor(stroke_color)
        c.setLineWidth(lw)
    c.roundRect(x, y, w, h, r, fill=1 if fill_color else 0, stroke=1 if stroke_color else 0)
    c.restoreState()

def draw_dashed_divider(c, x, y0, y1, color, dash=(2.5, 2.5), lw=1.2):
    c.saveState()
    c.setStrokeColor(color)
    c.setLineWidth(lw)
    c.setDash(dash[0], dash[1])
    c.line(x, y0, x, y1)
    c.restoreState()

def draw_notch(c, x, y, r, bg_color):
    c.setFillColor(bg_color)
    c.circle(x, y, r, fill=1, stroke=0)

def draw_social_icon(c, x, y, icon_type, size=4*mm, color=None):
    if color is None:
        color = TEXT_MUTED
    c.setFillColor(color)
    if icon_type == 'facebook':
        c.circle(x, y, size/2, fill=1, stroke=0)
        c.setFillColor(BG_DARK)
        c.circle(x, y, size/2 - 0.5*mm, fill=1, stroke=0)
        c.setFillColor(TEXT_WHITE)
        c.setFont('Helvetica-Bold', size * 0.7)
        c.drawCentredString(x, y - size * 0.2, "f")
    elif icon_type == 'instagram':
        c.setFillColor(color)
        c.roundRect(x - size/2, y - size/2, size, size, size * 0.2, fill=1, stroke=0)
        c.setFillColor(BG_DARK)
        c.roundRect(x - size/2 + 1*mm, y - size/2 + 1*mm, size - 2*mm, size - 2*mm, size*0.15, fill=1, stroke=0)
        c.setFillColor(color)
        c.circle(x, y, size * 0.2, fill=1, stroke=0)
        c.setFillColor(BG_DARK)
        c.circle(x, y, size * 0.12, fill=1, stroke=0)

def draw_smartpass_logo(c, x, y, size=8*mm):
    c.setFillColor(PURPLE)
    c.circle(x, y, size/2, fill=1, stroke=0)
    c.setFillColor(PURPLE_DARK)
    c.circle(x, y, size/2 - 0.8*mm, fill=1, stroke=0)
    c.setFillColor(TEXT_WHITE)
    c.setFont('Helvetica-Bold', size * 0.6)
    c.drawCentredString(x, y - size * 0.1, "S")
    c.setFont('Helvetica-Bold', 13)
    c.setFillColor(TEXT_WHITE)
    c.drawString(x + size/2 + 2*mm, y + 1.5*mm, "SmartPass")
    c.setFont('Helvetica', 6.5)
    c.setFillColor(TEXT_MUTED)
    c.drawString(x + size/2 + 2*mm, y - 3.5*mm, "YOUR TICKET. YOUR EXPERIENCE.")

def wrap_text(c, text, x, y, font, size, max_width, leading, color=None):
    if color:
        c.setFillColor(color)
    c.setFont(font, size)
    words = text.split()
    lines = []
    cur = ""
    for w in words:
        trial = (cur + " " + w).strip()
        if c.stringWidth(trial, font, size) <= max_width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y

# ─── Main drawing ──────────────────────────────────────────────────────
def draw_ticket(c, data):
    # ── Full background with glow ────────────────────────────────────
    c.setFillColor(BG_DARK)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    draw_glow(c, PAGE_W * 0.3, PAGE_H * 0.5, 80*mm, BLUE_GLOW)
    draw_glow(c, PAGE_W * 0.7, PAGE_H * 0.5, 60*mm, PINK_GLOW)

    # ── Card with gradient border ──────────────────────────────────
    card_x, card_y = CARD_MARGIN, CARD_MARGIN
    card_w, card_h = PAGE_W - 2*CARD_MARGIN, PAGE_H - 2*CARD_MARGIN
    draw_gradient_rect(c, card_x, card_y, card_w, card_h, PINK, BLUE)
    inset = 1.8
    rounded_rect(c, card_x + inset, card_y + inset, card_w - 2*inset, card_h - 2*inset,
                 6*mm, fill_color=BG_CARD)

    left_x0 = card_x + inset
    left_x1 = card_x + STUB_SPLIT
    top_y = card_y + card_h - 10*mm

    # ── Optional hero image ──────────────────────────────────────────
    if data.get('hero_image_path'):
        try:
            img = ImageReader(data['hero_image_path'])
            iw, ih = img.getSize()
            panel_w, panel_h = left_x1 - left_x0, card_h - 2*inset
            scale = max(panel_w / iw, panel_h / ih)
            dw, dh = iw * scale, ih * scale
            c.saveState()
            p = c.beginPath()
            p.roundRect(left_x0, card_y + inset, panel_w, panel_h, 5*mm)
            c.clipPath(p, stroke=0, fill=0)
            c.drawImage(img, left_x0 + (panel_w - dw)/2, card_y + inset + (panel_h - dh)/2,
                        dw, dh, mask='auto')
            c.setFillColorRGB(0, 0, 0, alpha=0.6)
            c.rect(left_x0, card_y + inset, panel_w, panel_h, fill=1, stroke=0)
            c.restoreState()
        except:
            pass

    # ── Left panel ───────────────────────────────────────────────────
    lx = left_x0 + 8*mm
    y = top_y

    draw_smartpass_logo(c, lx, y - 4*mm)

    pill_w, pill_h = 48*mm, 9*mm
    px = left_x1 - 8*mm - pill_w
    py = y - 8.5*mm
    draw_gradient_rect(c, px, py, pill_w, pill_h, PURPLE, BLUE)
    rounded_rect(c, px, py, pill_w, pill_h, pill_h/2)
    c.saveState()
    p = c.beginPath()
    p.roundRect(px, py, pill_w, pill_h, pill_h/2)
    c.clipPath(p, stroke=0, fill=0)
    draw_gradient_rect(c, px, py, pill_w, pill_h, PURPLE, BLUE)
    c.restoreState()
    c.setFont('Helvetica-Bold', 10)
    c.setFillColor(TEXT_WHITE)
    c.drawCentredString(px + pill_w/2, py + pill_h/2 - 1.8, data['ticket_type'].upper())

    y -= 26*mm
    c.setFont('Helvetica-Bold', 36)
    c.setFillColor(TEXT_WHITE)
    c.drawString(lx, y, data['title_line1'].upper())
    y -= 16*mm
    c.setFont('Helvetica-Bold', 36)
    c.setFillColor(BLUE)
    c.drawString(lx, y, data['title_line2'].upper())

    y -= 9*mm
    max_tagline_width = left_x1 - lx - 10*mm
    y = wrap_text(c, data['tagline'], lx, y, 'Helvetica', 10, max_tagline_width, 4*mm, color=TEXT_MUTED)

    y -= 6*mm
    rows = [data['date_str'], data['time_str']] + data['venue_lines']
    for i, line in enumerate(rows):
        if i < 2:
            c.setFillColor(PURPLE)
            c.roundRect(lx, y - 3*mm, 3.5*mm, 3.5*mm, 1*mm, fill=1, stroke=0)
            tx = lx + 7*mm
        else:
            tx = lx + 7*mm
        c.setFont('Helvetica-Bold', 10)
        c.setFillColor(TEXT_WHITE)
        if i >= 2:
            max_venue_width = left_x1 - tx - 6*mm
            y = wrap_text(c, line, tx, y, 'Helvetica-Bold', 10, max_venue_width, 4*mm, color=TEXT_WHITE)
        else:
            c.drawString(tx, y - 2.6*mm, line)
            y -= 6*mm

    y = card_y + inset + 26*mm
    c.setFont('Helvetica-Bold', 9)
    c.setFillColor(TEXT_LIGHT)
    c.drawString(lx, y, "GET TICKET")
    c.setFillColor(PINK)
    c.drawString(lx + 32*mm, y, "→")
    c.setFillColor(TEXT_LIGHT)
    c.drawString(lx + 40*mm, y, "SCAN QR")
    c.setFillColor(BLUE)
    c.drawString(lx + 72*mm, y, "→")
    c.setFillColor(TEXT_LIGHT)
    c.drawString(lx + 80*mm, y, "ENTER")

    footer_y = card_y + inset + 10*mm
    c.setStrokeColor(LINE_GREY)
    c.setLineWidth(0.5)
    c.line(lx, footer_y + 6*mm, left_x1 - 8*mm, footer_y + 6*mm)

    c.setFont('Helvetica-Bold', 8.5)
    c.setFillColor(TEXT_MUTED)
    c.drawString(lx, footer_y, data['website'])
    c.drawString(lx + 55*mm, footer_y, "SmartPass@gmail.com")

    icon_size = 3.5*mm
    icon_y = footer_y + 1.5*mm
    icon_x = lx + 108*mm
    draw_social_icon(c, icon_x, icon_y, 'facebook', size=icon_size, color=TEXT_MUTED)
    draw_social_icon(c, icon_x + 7*mm, icon_y, 'instagram', size=icon_size, color=TEXT_MUTED)

    # ── Right stub ──────────────────────────────────────────────────
    split_x = left_x1
    rx0 = split_x + 9*mm
    rx1 = card_x + card_w - inset - 8*mm
    ry = top_y

    c.setFont('Helvetica', 7.5)
    c.setFillColor(TEXT_MUTED)
    c.drawString(rx0, ry, "TICKET ID")
    c.setFont('Helvetica-Bold', 14)
    c.setFillColor(PINK)
    c.drawString(rx0, ry - 7*mm, data['ticket_id'])

    ry -= 16*mm
    c.setStrokeColor(LINE_GREY)
    c.setDash(1.5, 1.5)
    c.line(rx0, ry, rx1, ry)
    c.setDash()

    ry -= 7*mm
    c.setFont('Helvetica-Bold', 9)
    c.setFillColor(TEXT_LIGHT)
    c.drawString(rx0, ry, "SCAN TO VERIFY")

    qr_size = min(40*mm, rx1 - rx0)
    qr_x = rx0 + (rx1 - rx0 - qr_size) / 2
    qr_y = ry - qr_size - 7*mm

    # ─── Branded QR code (no URL text below) ─────────────────────
    qr_img = make_qr_with_logo(data['qr_data'], size_px=400, logo_size_ratio=0.25)
    c.setFillColor(white)
    c.rect(qr_x - 2*mm, qr_y - 2*mm, qr_size + 4*mm, qr_size + 4*mm, fill=1, stroke=0)
    c.drawImage(qr_img, qr_x, qr_y, qr_size, qr_size)

    # ─── No URL text – just the QR code ─────────────────────────

    ry = qr_y - 8*mm
    c.setStrokeColor(LINE_GREY)
    c.setDash(1.5, 1.5)
    c.line(rx0, ry, rx1, ry)
    c.setDash()

    details = [
        ("TICKET TYPE", data['ticket_type']),
        ("PRICE", data['price']),
        ("PURCHASED BY", data['purchaser']),
        ("DATE PURCHASED", data['date_purchased']),
    ]
    dy = ry - 7*mm
    for label, val in details:
        c.setFont('Helvetica', 7)
        c.setFillColor(TEXT_MUTED)
        c.drawString(rx0, dy, label)
        c.setFont('Helvetica-Bold', 10)
        color = PINK if label in ("TICKET TYPE", "PRICE") else TEXT_WHITE
        c.setFillColor(color)
        c.drawString(rx0, dy - 5*mm, str(val))
        dy -= 11*mm

    # ── Bottom gradient bar ──────────────────────────────────────────
    bar_h = 9*mm
    bar_y = card_y + inset
    draw_gradient_rect(c, left_x0, bar_y, card_w - 2*inset, bar_h, PURPLE, BLUE)
    rounded_rect(c, left_x0, bar_y, card_w - 2*inset, bar_h, 0, fill_color=None)
    c.saveState()
    p = c.beginPath()
    p.roundRect(left_x0, bar_y, card_w - 2*inset, bar_h, 6*mm)
    c.clipPath(p, stroke=0, fill=0)
    draw_gradient_rect(c, left_x0, bar_y, card_w - 2*inset, bar_h, PURPLE, BLUE)
    c.restoreState()
    c.setFont('Helvetica-Bold', 10)
    c.setFillColor(TEXT_WHITE)
    c.drawCentredString(left_x0 + (card_w - 2*inset)/2, bar_y + bar_h/2 - 1.8,
                         data.get('footer_note', 'NO REFUNDS  •  NO EXCHANGES'))

    # ── Perforation ──────────────────────────────────────────────────
    draw_notch(c, split_x, card_y + card_h, NOTCH_R, BG_DARK)
    draw_notch(c, split_x, card_y, NOTCH_R, BG_DARK)
    draw_dashed_divider(c, split_x, card_y + NOTCH_R + 2, card_y + card_h - NOTCH_R - 2,
                         color=HexColor('#3a3950'))

# ─── Public API ──────────────────────────────────────────────────────
def generate_ticket_pdf(
    title_line1: str,
    title_line2: str,
    tagline: str,
    date_str: str,
    time_str: str,
    venue_lines: list,
    ticket_type: str,
    ticket_id: str,
    price: str,
    purchaser: str,
    date_purchased: str,
    qr_data: str,   # MUST be the full verification URL
    organizer_name: str = "SmartPass",
    organizer_tag: str = "EVENTS",
    website: str = "www.smartpass.co.za",
    footer_note: str = "NO REFUNDS  •  NO EXCHANGES",
    hero_image_path: str = None,
    output_path: str = "ticket.pdf",
) -> str:
    data = {
        'organizer_name': organizer_name,
        'organizer_tag': organizer_tag,
        'title_line1': title_line1,
        'title_line2': title_line2,
        'tagline': tagline,
        'date_str': date_str,
        'time_str': time_str,
        'venue_lines': venue_lines,
        'ticket_type': ticket_type,
        'ticket_id': ticket_id,
        'price': price,
        'purchaser': purchaser,
        'date_purchased': date_purchased,
        'qr_data': qr_data,
        'website': website,
        'footer_note': footer_note,
        'hero_image_path': hero_image_path,
    }
    c = canvas.Canvas(output_path, pagesize=(PAGE_W, PAGE_H))
    draw_ticket(c, data)
    c.showPage()
    c.save()
    return output_path

# ─── Test ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    generate_ticket_pdf(
        title_line1="Beat",
        title_line2="Wave",
        tagline="Live music. One night. Unlimited memories.",
        date_str="21 June 2026",
        time_str="18:00 - 02:00",
        venue_lines=[
            "Cape Town International Convention Centre",
            "1 Lower Long St, Cape Town, 8001",
        ],
        ticket_type="General Admission",
        ticket_id="SPBW20262106",
        price="R250.00",
        purchaser="Marvin M.",
        date_purchased="01 May 2026",
        qr_data="https://smartpass.co.za/verify/SPBW20262106",
        website="www.smartpass.co.za",
        output_path="beat_wave_fixed.pdf",
    )
    print("Wrote beat_wave_fixed.pdf")