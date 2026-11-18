"""Build an editable 1080x1920 PPTX of the LinkedIn Business Card carousel for Canva import."""
from pptx import Presentation
from pptx.util import Emu, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from PIL import Image
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A, B = ROOT + '/assets/', ROOT + '/build/'
px = lambda v: Emu(int(v * 9525))
WHITE, GREY, BLACK = RGBColor(255, 255, 255), RGBColor(0xBD, 0xBD, 0xBD), RGBColor(0, 0, 0)
HEAD, BODY = 'Antonio', 'DM Sans'

prs = Presentation()
prs.slide_width, prs.slide_height = px(1080), px(1920)
blank = prs.slide_layouts[6]


def new_slide():
    s = prs.slides.add_slide(blank)
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = BLACK
    pic(s, B + 'grain.png', 0, 0, 1080)
    return s


def pic(s, path, x, y, w=None, h=None, rot=0):
    if w and not h:
        iw, ih = Image.open(path).size
        h = w * ih / iw
    p = s.shapes.add_picture(path, px(x), px(y), px(w), px(h))
    p.rotation = rot
    return p


def rect(s, x, y, w, h, color):
    r = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, px(x), px(y), px(w), px(h))
    r.fill.solid(); r.fill.fore_color.rgb = color; r.line.fill.background()
    return r


def text(s, x, y, w, h, paras, size, font=BODY, color=WHITE, bold=False,
         align=PP_ALIGN.LEFT, spacing=1.0, upper=False, anchor=MSO_ANCHOR.TOP):
    """paras: list of paragraphs; each paragraph is a str or a list of (text, overrides) runs."""
    tb = s.shapes.add_textbox(px(x), px(y), px(w), px(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    for m in ('margin_left', 'margin_right', 'margin_top', 'margin_bottom'):
        setattr(tf, m, 0)
    for i, para in enumerate(paras):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = spacing
        runs = [(para, {})] if isinstance(para, str) else para
        for t, o in runs:
            r = p.add_run()
            r.text = t.upper() if upper else t
            f = r.font
            f.name = o.get('font', font)
            f.size = Pt(o.get('size', size) * 0.75)
            f.bold = o.get('bold', bold)
            f.color.rgb = o.get('color', color)
    return tb


def logo(s):
    pic(s, A + 'logo13.png', 882, 80, 118)


def swipe(s):
    text(s, 760, 1786, 240, 50, ['Swipe  →'], 34, bold=True, align=PP_ALIGN.RIGHT)


def headline(s, lines, x=80, y=150, size=150, w=920):
    text(s, x, y, w, size * 0.92 * len(lines) + 40, lines, size, font=HEAD, bold=True, upper=True, spacing=0.88)


def strip(s, y, label, w=1040):
    pic(s, B + 'strip.png', 0, y - 20, w, 170 * w / 1040)
    text(s, 80, y, w - 140, 130, [label], 46, font=HEAD, bold=True, color=BLACK, anchor=MSO_ANCHOR.MIDDLE)


# 1 Cover
s = new_slide(); logo(s)
headline(s, ['LinkedIn', 'just gave', 'you a', 'business', 'card'], y=300, size=250)
strip(s, 1560, 'New feature · rolling out from 15 Oct 2026')
swipe(s)

# 2 2018 vs 2026
s = new_slide()
rect(s, 0, 0, 540, 1920, RGBColor(0x7A, 0x7A, 0x7A))
pic(s, B + 'blob.png', -60, -120, 560)
rect(s, 534, 0, 12, 1920, WHITE)
logo(s)
text(s, 60, 640, 440, 230, ['2018'], 230, font=HEAD, bold=True)
text(s, 60, 900, 440, 400, ['A plain QR code on your profile.', '', 'Scan it, land on the profile. That was it.'], 44, spacing=1.15)
text(s, 600, 640, 420, 230, ['2026'], 230, font=HEAD, bold=True)
text(s, 600, 900, 420, 500, ['A designed business card.', '', 'Layout, font, colour, pattern, stickers, Wallet, and a card collection.'], 44, spacing=1.15)
pic(s, B + 'ring.png', 620, 1480, 520)
swipe(s)

# 3 Free for every member
s = new_slide(); logo(s)
headline(s, ['Free for', 'every member'])
text(s, 80, 470, 860, 120, ['No Premium needed. Rolling out gradually, worldwide.'], 44, color=GREY, spacing=1.15)
pic(s, B + 'f_intro.png', 250, 640, 580)
swipe(s)

# 4 Make it yours
s = new_slide(); logo(s)
headline(s, ['Make it', 'yours'])
for i, (img, label) in enumerate([('layout', '01 Layout'), ('font', '02 Font'), ('colour', '03 Colour'), ('pattern', '04 Pattern')]):
    x, y = 80 + (i % 2) * 480, 520 + (i // 2) * 640
    pic(s, B + f'f_{img}.png', x, y, 440)
    text(s, x, y + 575, 440, 45, [label], 30, bold=True, upper=True)
swipe(s)

# 5 So I made mine
s = new_slide(); logo(s)
headline(s, ['So I made', 'mine'])
text(s, 80, 480, 900, 140, ['Front: black, grid, bold type.', 'Back: my 13 Media stamp.'], 44, color=GREY, spacing=1.15)
pic(s, B + 'f_final.png', 70, 720, 470, rot=-4)
pic(s, B + 'f_back.png', 540, 760, 470, rot=4)
swipe(s)

# 6 Why it beats the 2018 QR
s = new_slide(); logo(s)
headline(s, ['Why it beats', 'the 2018 QR'])
items = [('It looks like you.', '6 layouts, 6 fonts, colours and patterns.'),
         ('Card-only headline.', 'Edit it without touching your profile.'),
         ('Google Wallet.', 'Share in seconds, no app hunting.'),
         ('A back side.', 'Photo cut-outs and doodles.'),
         ('Card collection.', 'Remember who you met, and where.')]
for i, (t, d) in enumerate(items):
    y = 540 + i * 222
    text(s, 80, y - 8, 140, 120, [f'0{i + 1}'], 110, font=HEAD, bold=True)
    text(s, 230, y, 770, 170, [[(t, {'bold': True})], [(d, {'color': GREY})]], 44, spacing=1.15)
swipe(s)

# 7 Got yours yet?
s = new_slide(); logo(s)
headline(s, ['Got yours', 'yet?'], y=300, size=230)
text(s, 80, 830, 900, 260, ["It's rolling out gradually, so not everyone has it.", '', [('Has it landed on your profile?', {'color': GREY})]], 44, spacing=1.15)
pic(s, B + 'f_collect.png', 540, 1080, 440, rot=5)
strip(s, 1300, 'Tell me in the comments', w=560)

# 8 Treze Media outro
s = new_slide()
pic(s, A + 'logo13.png', 330, 360, 190)
text(s, 545, 345, 400, 230, ['Treze', 'Media'], 118, font=HEAD, bold=True, upper=True, spacing=0.86)
text(s, 0, 640, 1080, 60, ['By Cilla Zaghini'], 44, align=PP_ALIGN.CENTER)
text(s, 0, 712, 1080, 50, ['Marketing and Creative Insights, Unpacked.'], 36, align=PP_ALIGN.CENTER)
pic(s, A + 'headshot.png', 290, 860, 500)
text(s, 0, 1500, 1080, 100, ['Repost if this helped'], 90, font=HEAD, bold=True, upper=True, align=PP_ALIGN.CENTER)
text(s, 0, 1610, 1080, 100, ['Follow for more'], 90, font=HEAD, bold=True, upper=True, color=RGBColor(0x9A, 0x9A, 0x9A), align=PP_ALIGN.CENTER)

out = ROOT + '/LinkedIn-Business-Card-13Media.pptx'
prs.save(out)
print(out, os.path.getsize(out) // 1024, 'KB')
