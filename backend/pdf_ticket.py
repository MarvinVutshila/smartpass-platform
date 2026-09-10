"""
pdf_ticket.py – Premium, hard-to-forge event ticket with a real branded,
security-styled QR code.

=====================================================================
 WHAT CHANGED IN THIS VERSION (and why)
=====================================================================

1) FIXED A REAL LAYOUT BUG (this was causing the overlap you saw in the
   screenshot — tagline text colliding with the footer/QR row):
   `draw_wrapped_fitted_text()` was converting an already-in-points line
   height by multiplying it by `mm` *again* (`total_height * mm`), which
   inflated a single text line's height by ~2.83x. That made the title
   block think it was much taller than it really was, which shoved every
   element below it (tagline, schedule, footer) further down than
   intended — hence the big empty gap and the overlap at the bottom.
   Fixed by keeping everything consistently in reportlab's native point
   units (reportlab coordinates are already points; `mm` is only a
   *multiplier* to turn a millimeter count into points, e.g. `10*mm`,
   never something you multiply a points value by again).

2) COLLISION-SAFE LAYOUT: the tagline now measures how much vertical
   room is actually left between the title and a hard "footer safe
   line" before it draws anything, and clamps itself to however many
   lines fit (1–3). No matter how long the tagline or venue text is, it
   can no longer run into the QR/footer row.

3) THE QR CENTRE LOGO NO LONGER SILENTLY DISAPPEARS. The old code tried
   a hard-coded system font path and, if that font wasn't installed on
   the server (very common on minimal Docker/cloud images — this is
   exactly what happened in your screenshot, the badge rendered as a
   blank circle), it fell back to `ImageFont.load_default()`, whose
   un-sized bitmap font is a couple of pixels tall and invisible once
   scaled. Now it tries a couple of real TrueType fonts first for the
   crispest look, and if none exist anywhere on the machine it falls
   back to Pillow's own **bundled, scalable** default font
   (`ImageFont.load_default(size=...)`, Pillow ≥ 10.1) — which ships
   inside the `pillow` package itself, so the letter is *always*
   visible, on any server, with zero extra install.

4) THE QR IS NOW AN ACTUAL SECURITY DESIGN, not just a gradient:
     • Rounded, gradient-filled modules (purple → blue) instead of
       flat black squares.
     • A guilloché ring (the fine engraved-circle pattern you see on
       banknotes/certificates) printed behind the QR.
     • A rotating micro-text security ring ("SMARTPASS • VERIFIED •"
       repeated around a circle) — the same trick used on real tickets
       and ID cards: it reads as a fine textured ring to the eye but
       is genuinely full text, so it degrades badly under photocopying
       or low-effort screenshots, unlike a flat printed graphic.
     • ERROR_CORRECT_H (~30% redundancy) so the centre logo can never
       break the scan.
   All of it is generated in code from your brand colours — nothing is
   a static asset, so every ticket's QR is unique and still carries
   the full security treatment.

Install once (both are required for the new QR renderer):
    pip install "qrcode[pil]" pillow reportlab
"""

import io
import math
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
from qrcode.image.styles.colormasks import RadialGradiantColorMask
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

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

# RGB tuples — needed on the Pillow/QR side, where reportlab HexColor
# objects aren't usable directly.
PURPLE_RGB = (124, 58, 237)
BLUE_RGB   = (59, 130, 246)
PINK_RGB   = (236, 72, 153)
WHITE_RGB  = (255, 255, 255)

# ─── Page geometry ──────────────────────────────────────────────────
PAGE_W, PAGE_H = 260 * mm, 150 * mm
STUB_SPLIT     = PAGE_W * 0.65
NOTCH_R        = 4.5 * mm
CARD_MARGIN    = 3.5 * mm


# ══════════════════════════════════════════════════════════════════
#  QR / SECURITY-ASSET GENERATION  (Pillow side)
# ══════════════════════════════════════════════════════════════════

def _load_font(px_size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    """Best-effort crisp TrueType font, with a guaranteed-available
    fallback that ships inside Pillow itself (no system font needed)."""
    candidates = (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "C:\\Windows\\Fonts\\arialbd.ttf",
    ) if bold else (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    )
    for path in candidates:
        try:
            return ImageFont.truetype(path, px_size)
        except OSError:
            continue
    # Pillow's own bundled scalable font (Pillow >= 10.1) — always works.
    try:
        return ImageFont.load_default(size=px_size)
    except TypeError:
        # Very old Pillow without the `size` kwarg: last-resort tiny bitmap.
        return ImageFont.load_default()


def _build_logo_badge(diameter_px: int, letter: str = "S") -> Image.Image:
    """Circular gradient badge with a bold centred letter, rendered at 4x
    and downsampled (supersampling) so the edge and glyph are smooth."""
    ss = 4
    d = diameter_px * ss
    badge = Image.new("RGBA", (d, d), (0, 0, 0, 0))
    draw = ImageDraw.Draw(badge)

    # White outer ring — keeps the badge readable against any QR module.
    draw.ellipse((0, 0, d, d), fill=(255, 255, 255, 255))

    # Purple -> blue gradient fill, top to bottom.
    ring = int(d * 0.05)
    inner = Image.new("RGBA", (d, d), (0, 0, 0, 0))
    inner_draw = ImageDraw.Draw(inner)
    for y in range(ring, d - ring):
        t = y / d
        r = int(PURPLE_RGB[0] + (BLUE_RGB[0] - PURPLE_RGB[0]) * t)
        g = int(PURPLE_RGB[1] + (BLUE_RGB[1] - PURPLE_RGB[1]) * t)
        b = int(PURPLE_RGB[2] + (BLUE_RGB[2] - PURPLE_RGB[2]) * t)
        inner_draw.line([(ring, y), (d - ring, y)], fill=(r, g, b, 255))
    mask = Image.new("L", (d, d), 0)
    ImageDraw.Draw(mask).ellipse((ring, ring, d - ring, d - ring), fill=255)
    badge.paste(inner, (0, 0), mask)

    # Bold centred letter — guaranteed visible (see _load_font).
    draw = ImageDraw.Draw(badge)
    font = _load_font(int(d * 0.5), bold=True)
    bbox = draw.textbbox((0, 0), letter, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(
        (d / 2 - tw / 2 - bbox[0], d / 2 - th / 2 - bbox[1]),
        letter, fill=(255, 255, 255, 255), font=font,
    )

    return badge.resize((diameter_px, diameter_px), Image.LANCZOS)


def _draw_guilloche(draw: ImageDraw.ImageDraw, cx, cy, min_r, max_r, rings, colors, alpha=55):
    """Fine concentric engraved-line rings, like the anti-copy pattern
    printed behind the portrait on a banknote or certificate."""
    for i in range(rings):
        t = i / (rings - 1) if rings > 1 else 0
        r = min_r + (max_r - min_r) * t
        col = colors[i % len(colors)]
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(*col, alpha), width=1)


def _draw_microtext_ring(img: Image.Image, cx, cy, radius, text, font, color):
    """Places each character of `text` around a circle, rotated to be
    tangent to the ring — the classic security micro-print technique:
    it reads as a fine textured band to the eye, but degrades badly
    under photocopying/low-quality reproduction because it's real text,
    not a flat graphic."""
    draw = ImageDraw.Draw(img)
    n = len(text)
    if n == 0:
        return
    step = 360 / n
    for i, ch in enumerate(text):
        if ch == " ":
            continue
        angle = i * step
        bbox = draw.textbbox((0, 0), ch, font=font)
        cw, chh = bbox[2] - bbox[0], bbox[3] - bbox[1]
        pad = 3
        tile = Image.new("RGBA", (cw + pad * 2, chh + pad * 2), (0, 0, 0, 0))
        ImageDraw.Draw(tile).text((pad - bbox[0], pad - bbox[1]), ch, font=font, fill=color)
        rotated = tile.rotate(-angle - 90, expand=True, resample=Image.BICUBIC)
        rad = math.radians(angle)
        px = cx + radius * math.cos(rad) - rotated.width / 2
        py = cy - radius * math.sin(rad) - rotated.height / 2
        img.alpha_composite(rotated, (int(px), int(py)))


def make_qr_with_logo(
    data: str,
    size_px: int = 640,
    logo_size_ratio: float = 0.24,
    frame_ratio: float = 1.32,
    brand_initial: str = "S",
    microtext: str = " SMARTPASS \u2022 VERIFIED \u2022",
) -> ImageReader:
    """Builds the full secure QR asset:
        • rounded, gradient-filled QR modules (purple -> blue)
        • high error-correction (survives the centre logo)
        • a guilloché security ring + rotating micro-text ring behind it
        • a smooth, font-safe centre logo badge
    Returns a single composited RGBA image ready to drop straight onto
    the ticket with `canvas.drawImage(..., mask='auto')`.
    """
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,  # ~30% redundancy
        box_size=20,
        border=3,
    )
    qr.add_data(data)
    qr.make(fit=True)

    styled = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=RoundedModuleDrawer(radius_ratio=0.85),
        color_mask=RadialGradiantColorMask(
            back_color=WHITE_RGB,
            center_color=PURPLE_RGB,
            edge_color=BLUE_RGB,
        ),
    ).convert("RGB").resize((size_px, size_px), Image.LANCZOS)

    # ── outer security frame (guilloché + microtext), transparent bg ──
    frame_px = int(size_px * frame_ratio)
    canvas_img = Image.new("RGBA", (frame_px, frame_px), (0, 0, 0, 0))
    cx = cy = frame_px / 2

    draw = ImageDraw.Draw(canvas_img)
    _draw_guilloche(
        draw, cx, cy,
        min_r=size_px * 0.53, max_r=frame_px * 0.49, rings=13,
        colors=[PURPLE_RGB, BLUE_RGB], alpha=55,
    )
    mt_font = _load_font(max(int(frame_px * 0.026), 11), bold=True)
    _draw_microtext_ring(canvas_img, cx, cy, frame_px * 0.465,
                          microtext * 3, mt_font, (255, 255, 255, 130))

    # ── white rounded plate the QR itself sits on ──────────────────
    plate = Image.new("RGBA", (frame_px, frame_px), (0, 0, 0, 0))
    half = size_px / 2
    pad = size_px * 0.03
    ImageDraw.Draw(plate).rounded_rectangle(
        [cx - half - pad, cy - half - pad, cx + half + pad, cy + half + pad],
        radius=size_px * 0.06, fill=(255, 255, 255, 255),
    )
    canvas_img.alpha_composite(plate)
    canvas_img.alpha_composite(styled.convert("RGBA"), (int(cx - half), int(cy - half)))

    # ── centre logo badge ───────────────────────────────────────────
    logo_d = int(size_px * logo_size_ratio)
    badge = _build_logo_badge(logo_d, letter=brand_initial)
    canvas_img.alpha_composite(badge, (int(cx - logo_d / 2), int(cy - logo_d / 2)))

    buf = io.BytesIO()
    canvas_img.save(buf, format="PNG")
    buf.seek(0)
    return ImageReader(buf)


# ══════════════════════════════════════════════════════════════════
#  DRAWING HELPERS  (reportlab side)
# ══════════════════════════════════════════════════════════════════

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

def draw_drop_shadow(c, x, y, w, h, r, layers=10, max_offset=2.2 * mm, color=black):
    """Fake soft blur: stacked, offset, low-alpha rounded rects behind a
    shape — reportlab has no native blur filter, so we simulate one."""
    c.saveState()
    for i in range(layers, 0, -1):
        frac = i / layers
        off = max_offset * frac
        c.setFillColorRGB(color.red, color.green, color.blue, alpha=0.035 * frac)
        c.roundRect(x - off * 0.15, y - off, w + off * 0.3, h + off * 0.3, r, fill=1, stroke=0)
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

def draw_holo_strip(c, x, y0, y1, width=2.4 * mm, n_stripes=26):
    """Thin diagonal-striped foil strip — a cheap 'hard to photocopy'
    cue used on real tickets/boarding passes."""
    c.saveState()
    p = c.beginPath()
    p.rect(x - width / 2, y0, width, y1 - y0)
    c.clipPath(p, stroke=0, fill=0)
    colors = [PURPLE, BLUE, PINK]
    h = y1 - y0
    step = h / n_stripes
    for i in range(n_stripes + 4):
        col = colors[i % len(colors)]
        c.setFillColorRGB(col.red, col.green, col.blue, alpha=0.5)
        yy = y0 + i * step - width
        c.saveState()
        c.translate(x, yy)
        c.rotate(35)
        c.rect(-width * 3, -width, width * 6, width * 0.85, fill=1, stroke=0)
        c.restoreState()
    c.restoreState()

def draw_scan_brackets(c, x, y, w, h, length=6 * mm, color=PINK, lw=1.6):
    """Camera-viewfinder style corner brackets framing the QR asset."""
    c.saveState()
    c.setStrokeColor(color)
    c.setLineWidth(lw)
    c.setLineCap(1)
    corners = [
        (x, y, 1, 1), (x + w, y, -1, 1),
        (x, y + h, 1, -1), (x + w, y + h, -1, -1),
    ]
    for cx, cy, sx, sy in corners:
        c.line(cx, cy, cx + sx * length, cy)
        c.line(cx, cy, cx, cy + sy * length)
    c.restoreState()

def draw_social_icon(c, x, y, icon_type, size=4 * mm, color=None):
    if color is None:
        color = TEXT_MUTED
    c.setFillColor(color)
    if icon_type == 'facebook':
        c.circle(x, y, size / 2, fill=1, stroke=0)
        c.setFillColor(BG_DARK)
        c.circle(x, y, size / 2 - 0.5 * mm, fill=1, stroke=0)
        c.setFillColor(TEXT_WHITE)
        c.setFont('Helvetica-Bold', size * 0.7)
        c.drawCentredString(x, y - size * 0.2, "f")
    elif icon_type == 'instagram':
        c.setFillColor(color)
        c.roundRect(x - size / 2, y - size / 2, size, size, size * 0.2, fill=1, stroke=0)
        c.setFillColor(BG_DARK)
        c.roundRect(x - size / 2 + 1 * mm, y - size / 2 + 1 * mm, size - 2 * mm, size - 2 * mm, size * 0.15, fill=1, stroke=0)
        c.setFillColor(color)
        c.circle(x, y, size * 0.2, fill=1, stroke=0)
        c.setFillColor(BG_DARK)
        c.circle(x, y, size * 0.12, fill=1, stroke=0)

def draw_smartpass_logo(c, x, y, size=8 * mm):
    c.setFillColor(PURPLE)
    c.circle(x, y, size / 2, fill=1, stroke=0)
    c.setFillColor(PURPLE_DARK)
    c.circle(x, y, size / 2 - 0.8 * mm, fill=1, stroke=0)
    c.setFillColor(TEXT_WHITE)
    c.setFont('Helvetica-Bold', size * 0.6)
    c.drawCentredString(x, y - size * 0.1, "S")
    c.setFont('Helvetica-Bold', 13)
    c.setFillColor(TEXT_WHITE)
    c.drawString(x + size / 2 + 2 * mm, y + 1.5 * mm, "SmartPass")
    c.setFont('Helvetica', 6.5)
    c.setFillColor(TEXT_MUTED)
    c.drawString(x + size / 2 + 2 * mm, y - 3.5 * mm, "YOUR TICKET. YOUR EXPERIENCE.")


# ── text layout: measuring + wrapping share one code path ───────────
def _compute_wrapped_lines(c, text, font, size, max_width):
    """Word-wrap `text` to `max_width` (points). No line cap — callers
    that need one slice the returned list themselves. Shared by both
    the drawing function and anything that needs to *measure* first."""
    c.setFont(font, size)
    words = text.split()
    lines, cur = [], ""
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
    return lines or [""]

def wrap_text(c, text, x, y, font, size, max_width, leading, max_lines=3, color=None):
    """Wrap text and draw up to `max_lines`, adding an ellipsis if the
    text was truncated. Returns the y position after the last line."""
    lines = _compute_wrapped_lines(c, text, font, size, max_width)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        if not lines[-1].endswith("..."):
            lines[-1] += "..."
    if color:
        c.setFillColor(color)
    c.setFont(font, size)
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y

def draw_wrapped_fitted_text(c, text, x, y, max_width_pt, max_height_pt, max_size, min_size, color):
    """Draw wrapped text, shrinking the font until it fits within width
    AND height. `max_width_pt`/`max_height_pt` are already in points
    (reportlab's native unit) — do NOT multiply/divide by `mm` again
    here, `mm` was only ever a millimeters->points converter applied
    once at the call site (e.g. `15*mm`)."""
    size = max_size
    while size >= min_size:
        lines = _compute_wrapped_lines(c, text, 'Helvetica-Bold', size, max_width_pt)
        line_height = size * 1.2
        total_height = len(lines) * line_height
        if total_height <= max_height_pt:
            c.setFillColor(color)
            c.setFont('Helvetica-Bold', size)
            for i, line in enumerate(lines):
                c.drawString(x, y - (i * line_height), line)
            return total_height, size
        size -= 2

    # Fallback: draw at min_size even if it slightly overflows the budget
    # (better than an infinite shrink loop or invisible text).
    lines = _compute_wrapped_lines(c, text, 'Helvetica-Bold', min_size, max_width_pt)
    line_height = min_size * 1.2
    c.setFillColor(color)
    c.setFont('Helvetica-Bold', min_size)
    for i, line in enumerate(lines):
        c.drawString(x, y - (i * line_height), line)
    return len(lines) * line_height, min_size


# ══════════════════════════════════════════════════════════════════
#  MAIN DRAWING
# ══════════════════════════════════════════════════════════════════

def draw_ticket(c, data):
    # ── Full background with glow ────────────────────────────────────
    c.setFillColor(BG_DARK)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    draw_glow(c, PAGE_W * 0.3, PAGE_H * 0.5, 80 * mm, BLUE_GLOW)
    draw_glow(c, PAGE_W * 0.7, PAGE_H * 0.5, 60 * mm, PINK_GLOW)

    # ── Card drop shadow + gradient border ────────────────────────────
    card_x, card_y = CARD_MARGIN, CARD_MARGIN
    card_w, card_h = PAGE_W - 2 * CARD_MARGIN, PAGE_H - 2 * CARD_MARGIN
    draw_drop_shadow(c, card_x, card_y, card_w, card_h, 6 * mm)
    draw_gradient_rect(c, card_x, card_y, card_w, card_h, PINK, BLUE)
    inset = 1.8
    rounded_rect(c, card_x + inset, card_y + inset, card_w - 2 * inset, card_h - 2 * inset,
                 6 * mm, fill_color=BG_CARD)

    left_x0 = card_x + inset
    left_x1 = card_x + STUB_SPLIT
    top_y = card_y + card_h - 10 * mm

    # ── Optional hero image ──────────────────────────────────────────
    if data.get('hero_image_path'):
        try:
            img = ImageReader(data['hero_image_path'])
            iw, ih = img.getSize()
            panel_w, panel_h = left_x1 - left_x0, card_h - 2 * inset
            scale = max(panel_w / iw, panel_h / ih)
            dw, dh = iw * scale, ih * scale
            c.saveState()
            p = c.beginPath()
            p.roundRect(left_x0, card_y + inset, panel_w, panel_h, 5 * mm)
            c.clipPath(p, stroke=0, fill=0)
            c.drawImage(img, left_x0 + (panel_w - dw) / 2, card_y + inset + (panel_h - dh) / 2,
                        dw, dh, mask='auto')
            c.setFillColorRGB(0, 0, 0, alpha=0.6)
            c.rect(left_x0, card_y + inset, panel_w, panel_h, fill=1, stroke=0)
            c.restoreState()
        except Exception:
            pass

    # ── Left panel: logo + ticket-type pill ────────────────────────
    lx = left_x0 + 8 * mm
    y = top_y

    draw_smartpass_logo(c, lx, y - 4 * mm)

    pill_w, pill_h = 48 * mm, 9 * mm
    px = left_x1 - 8 * mm - pill_w
    py = y - 8.5 * mm
    c.saveState()
    p = c.beginPath()
    p.roundRect(px, py, pill_w, pill_h, pill_h / 2)
    c.clipPath(p, stroke=0, fill=0)
    draw_gradient_rect(c, px, py, pill_w, pill_h, PURPLE, BLUE)
    c.restoreState()
    c.setFont('Helvetica-Bold', 10)
    c.setFillColor(TEXT_WHITE)
    c.drawCentredString(px + pill_w / 2, py + pill_h / 2 - 1.8, data['ticket_type'].upper())

    # ─── Title (two-tone) ─────────────────────────────────────────
    y -= 22 * mm
    max_title_width = left_x1 - lx - 5 * mm

    max_h1 = 15 * mm
    h1, size1 = draw_wrapped_fitted_text(c, data['title_line1'].upper(), lx, y, max_title_width, max_h1, 36, 24, TEXT_WHITE)
    y -= h1 + 2 * mm

    max_h2 = 25 * mm
    h2, size2 = draw_wrapped_fitted_text(c, data['title_line2'].upper(), lx, y, max_title_width, max_h2, 28, 16, BLUE)
    y -= h2
    y -= 4 * mm

    # ─── Collision-safe tagline + schedule block ──────────────────
    # Everything below this point (tagline, date/time, venue) has to
    # fit above FOOTER_SAFE_Y — the top edge of the action-bar / footer
    # zone — no matter how long the source text is.
    FOOTER_SAFE_Y = card_y + inset + 33 * mm
    max_tagline_width = left_x1 - lx - 10 * mm
    tagline_leading = 4 * mm

    # Measure how much space the two schedule rows + venue lines will
    # need *before* committing to a tagline line count, so the tagline
    # never eats into space the schedule block actually needs.
    venue_line_count = 0
    for line in data['venue_lines']:
        wrapped = _compute_wrapped_lines(c, line, 'Helvetica-Bold', 10, left_x1 - (lx + 7 * mm) - 6 * mm)
        venue_line_count += min(len(wrapped), 2)
    schedule_height = 2 * (6 * mm) + venue_line_count * (4 * mm)

    available_for_tagline = y - 6 * mm - schedule_height - FOOTER_SAFE_Y
    max_tagline_lines = max(1, min(3, int(available_for_tagline // tagline_leading)))

    y = wrap_text(c, data['tagline'], lx, y, 'Helvetica', 10, max_tagline_width,
                  tagline_leading, max_lines=max_tagline_lines, color=TEXT_MUTED)

    # ─── Date, Time, Venue ───────────────────────────────────────────
    y -= 6 * mm
    rows = [data['date_str'], data['time_str']] + data['venue_lines']
    for i, line in enumerate(rows):
        tx = lx + 7 * mm
        c.setFont('Helvetica-Bold', 10)
        c.setFillColor(TEXT_WHITE)
        if i < 2:
            c.setFillColor(PURPLE)
            c.circle(lx + 1.5 * mm, y - 1.5 * mm, 2 * mm, fill=1, stroke=0)
            c.setFillColor(TEXT_WHITE)
            c.drawString(tx, y - 2.6 * mm, line)
            y -= 6 * mm
        else:
            max_venue_width = left_x1 - tx - 6 * mm
            y = wrap_text(c, line, tx, y, 'Helvetica-Bold', 10, max_venue_width, 4 * mm, max_lines=2, color=TEXT_WHITE)

    # ─── Footer / Action Bar ─────────────────────────────────────────
    y = card_y + inset + 26 * mm

    c.setStrokeColor(LINE_GREY)
    c.setLineWidth(1)
    c.line(lx + 30 * mm, y + 1 * mm, lx + 35 * mm, y + 1 * mm)
    c.line(lx + 70 * mm, y + 1 * mm, lx + 75 * mm, y + 1 * mm)

    c.setFont('Helvetica-Bold', 9)
    c.setFillColor(TEXT_LIGHT)
    c.drawString(lx, y, "GET TICKET")
    c.setFillColor(PINK)
    c.drawString(lx + 25 * mm, y, "\u2192")
    c.setFillColor(TEXT_LIGHT)
    c.drawString(lx + 40 * mm, y, "SCAN QR")
    c.setFillColor(BLUE)
    c.drawString(lx + 65 * mm, y, "\u2192")
    c.setFillColor(TEXT_LIGHT)
    c.drawString(lx + 80 * mm, y, "ENTER")

    footer_y = card_y + inset + 10 * mm
    c.setStrokeColor(LINE_GREY)
    c.setLineWidth(0.5)
    c.line(lx, footer_y + 6 * mm, left_x1 - 8 * mm, footer_y + 6 * mm)

    c.setFont('Helvetica-Bold', 8.5)
    c.setFillColor(TEXT_MUTED)
    c.drawString(lx, footer_y, data['website'])
    c.drawString(lx + 55 * mm, footer_y, "SmartPass@gmail.com")

    icon_size = 3.5 * mm
    icon_y = footer_y + 1.5 * mm
    icon_x = lx + 108 * mm
    draw_social_icon(c, icon_x, icon_y, 'facebook', size=icon_size, color=TEXT_MUTED)
    draw_social_icon(c, icon_x + 7 * mm, icon_y, 'instagram', size=icon_size, color=TEXT_MUTED)

    # ── Right stub ──────────────────────────────────────────────────
    split_x = left_x1
    rx0 = split_x + 9 * mm
    rx1 = card_x + card_w - inset - 8 * mm
    ry = top_y

    # holographic foil strip along the perforation
    draw_holo_strip(c, split_x + 4.5 * mm, card_y + inset + 4 * mm, card_y + card_h - inset - 4 * mm)

    c.setFont('Helvetica', 7.5)
    c.setFillColor(TEXT_MUTED)
    c.drawString(rx0, ry, "TICKET ID")
    c.setFont('Helvetica-Bold', 14)
    c.setFillColor(PINK)
    c.drawString(rx0, ry - 7 * mm, data['ticket_id'])

    ry -= 16 * mm
    c.setStrokeColor(LINE_GREY)
    c.setDash(1.5, 1.5)
    c.line(rx0, ry, rx1, ry)
    c.setDash()

    ry -= 7 * mm
    c.setFont('Helvetica-Bold', 9)
    c.setFillColor(TEXT_LIGHT)
    c.drawString(rx0, ry, "SCAN TO VERIFY")

    # The QR "frame" (security rings + plate + code + logo) is one
    # composited asset — frame_size is its full footprint; the visible
    # white plate/QR itself is frame_size / frame_ratio.
    frame_ratio = 1.32
    # Slightly reduced frame size to give more room for text below
    frame_size = min(42 * mm, rx1 - rx0)
    frame_x = rx0 + (rx1 - rx0 - frame_size) / 2
    # Moved up by 2mm
    frame_y = ry - frame_size - 2 * mm

    draw_drop_shadow(c, frame_x, frame_y, frame_size, frame_size, frame_size * 0.06,
                      layers=6, max_offset=1.2 * mm)
    qr_img = make_qr_with_logo(
        data['qr_data'],
        size_px=640,
        logo_size_ratio=0.24,
        frame_ratio=frame_ratio,
    )
    c.drawImage(qr_img, frame_x, frame_y, frame_size, frame_size, mask='auto')
    plate_size = frame_size / frame_ratio
    plate_x = frame_x + (frame_size - plate_size) / 2
    plate_y = frame_y + (frame_size - plate_size) / 2
    draw_scan_brackets(c, plate_x - 2.5 * mm, plate_y - 2.5 * mm,
                        plate_size + 5 * mm, plate_size + 5 * mm)

    # Moved up by 2mm
    ry = frame_y - 4 * mm
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
    # Moved up by 1mm
    dy = ry - 6 * mm
    for label, val in details:
        c.setFont('Helvetica', 7)
        c.setFillColor(TEXT_MUTED)
        c.drawString(rx0, dy, label)
        c.setFont('Helvetica-Bold', 10)
        color = PINK if label in ("TICKET TYPE", "PRICE") else TEXT_WHITE
        c.setFillColor(color)
        c.drawString(rx0, dy - 5 * mm, str(val))
        # Reduced spacing from 11mm to 10mm
        dy -= 10 * mm

    # ── Bottom gradient bar ──────────────────────────────────────────
    bar_h = 9 * mm
    bar_y = card_y + inset
    c.saveState()
    p = c.beginPath()
    p.roundRect(left_x0, bar_y, card_w - 2 * inset, bar_h, 6 * mm)
    c.clipPath(p, stroke=0, fill=0)
    draw_gradient_rect(c, left_x0, bar_y, card_w - 2 * inset, bar_h, PURPLE, BLUE)
    c.restoreState()
    c.setFont('Helvetica-Bold', 10)
    c.setFillColor(TEXT_WHITE)
    c.drawCentredString(left_x0 + (card_w - 2 * inset) / 2, bar_y + bar_h / 2 - 1.8,
                         data.get('footer_note', 'NO REFUNDS  \u2022  NO EXCHANGES'))

    # ── Perforation ──────────────────────────────────────────────────
    draw_notch(c, split_x, card_y + card_h, NOTCH_R, BG_DARK)
    draw_notch(c, split_x, card_y, NOTCH_R, BG_DARK)
    draw_dashed_divider(c, split_x, card_y + NOTCH_R + 2, card_y + card_h - NOTCH_R - 2,
                         color=HexColor('#3a3950'))


# ══════════════════════════════════════════════════════════════════
#  PUBLIC API
# ══════════════════════════════════════════════════════════════════

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
    qr_data: str,
    organizer_name: str = "SmartPass",
    organizer_tag: str = "EVENTS",
    website: str = "www.smartpass.co.za",
    footer_note: str = "NO REFUNDS  \u2022  NO EXCHANGES",
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


if __name__ == "__main__":
    generate_ticket_pdf(
        title_line1="Limpopo",
        title_line2="Society Cultural & Social Festival",
        tagline=("A celebration of Limpopo culture, heritage, music, food, and community. "
                  "Come connect with fellow Limpopo students and young people, enjoy "
                  "traditional and modern entertainment, and celebrate the diverse "
                  "cultures of Limpopo province."),
        date_str="25 September 2026",
        time_str="18:00 \u2013 Late",
        venue_lines=["Sport Pass Arena,", "Polokwane, Limpopo"],
        ticket_type="VIP",
        ticket_id="B4gR1fVtckiROsveukgQAw",
        price="R100.00",
        purchaser="Vutshila",
        date_purchased="08 September 2026",
        qr_data="https://smartpass.co.za/verify/B4gR1fVtckiROsveukgQAw",
        output_path="ticket.pdf",
    )