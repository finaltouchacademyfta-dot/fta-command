"""FTA app icons from the gold emblem (public/brand/emblem.png) -> public/icons/.
   python3 tools/make-icons.py   (needs Pillow; output is committed, so Netlify never runs this)"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageChops
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'public', 'brand', 'emblem.png'); OUT = os.path.join(ROOT, 'public', 'icons')
os.makedirs(OUT, exist_ok=True)
EM = Image.open(SRC).convert('RGBA'); EM = EM.crop(EM.getbbox())
BG_IN, BG_OUT, GOLD = (30, 34, 40), (8, 9, 11), (212, 179, 106)

def backdrop(n):
    """deep charcoal with a soft centre glow (FTA Premium)"""
    g = Image.new('L', (n, n), 0); d = ImageDraw.Draw(g)
    for i in range(60):
        r = n * (0.75 - i * 0.0115); v = int(255 * (i / 60) ** 1.4)
        d.ellipse([n / 2 - r, n * 0.44 - r, n / 2 + r, n * 0.44 + r], fill=v)
    g = g.filter(ImageFilter.GaussianBlur(n / 18))
    return Image.composite(Image.new('RGBA', (n, n), BG_IN + (255,)), Image.new('RGBA', (n, n), BG_OUT + (255,)), g)

def place(img, n, frac, dy=0.0):
    e = EM.copy(); s = n * frac / max(e.size); e = e.resize((max(1, round(e.width * s)), max(1, round(e.height * s))), Image.LANCZOS)
    glow = Image.new('RGBA', img.size, (0, 0, 0, 0)); a = e.split()[3].point(lambda v: v * 0.35)
    gl = Image.new('RGBA', e.size, GOLD + (0,)); gl.putalpha(a)
    x, y = (n - e.width) // 2, int((n - e.height) / 2 + n * dy)
    glow.paste(gl, (x, y), gl); glow = glow.filter(ImageFilter.GaussianBlur(n / 40))
    img.alpha_composite(glow); img.alpha_composite(e, (x, y)); return img

def rounded(img, radius_frac, ring=True):
    n = img.width; S = 4; m = Image.new('L', (n * S, n * S), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, n * S - 1, n * S - 1], radius=int(n * S * radius_frac), fill=255)
    m = m.resize((n, n), Image.LANCZOS)
    if ring:
        r = Image.new('RGBA', (n * S, n * S), (0, 0, 0, 0)); w = max(S, int(n * S * 0.012))
        ImageDraw.Draw(r).rounded_rectangle([w, w, n * S - 1 - w, n * S - 1 - w], radius=int(n * S * radius_frac) - w, outline=GOLD + (150,), width=w)
        img.alpha_composite(r.resize((n, n), Image.LANCZOS))
    out = Image.new('RGBA', (n, n), (0, 0, 0, 0)); out.paste(img, (0, 0), m); return out

def save(img, name): img.save(os.path.join(OUT, name), optimize=True); print('icons/' + name, img.size)

for n in (192, 512):                                   # "any": rounded tile with a gold hairline
    save(rounded(place(backdrop(n), n, 0.66, 0.01), 0.22), f'icon-{n}.png')
for n in (192, 512):                                   # "maskable": full bleed, emblem inside the 80% safe circle
    save(place(backdrop(n), n, 0.52, 0.01), f'maskable-{n}.png')
save(place(backdrop(180), 180, 0.64, 0.01).convert('RGB'), 'apple-touch-icon.png')   # iOS rounds it itself
for n in (32, 16): save(rounded(place(backdrop(n * 4), n * 4, 0.8), 0.22, False).resize((n, n), Image.LANCZOS), f'favicon-{n}.png')
rounded(place(backdrop(256), 256, 0.8), 0.22, False).save(os.path.join(OUT, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)]); print('icons/favicon.ico')
# notification badge (Android status bar): white silhouette on transparent, 96 px
b = Image.new('RGBA', (96, 96), (0, 0, 0, 0)); e = EM.copy(); s = 84 / max(e.size); e = e.resize((round(e.width * s), round(e.height * s)), Image.LANCZOS)
a = e.split()[3].point(lambda v: 255 if v > 90 else 0); w = Image.new('RGBA', e.size, (255, 255, 255, 255)); w.putalpha(a)
b.paste(w, ((96 - e.width) // 2, (96 - e.height) // 2), w); save(b, 'badge-96.png')
# notification icon (large, shown beside the text)
save(rounded(place(backdrop(192), 192, 0.7), 0.5, False), 'notify-192.png')
