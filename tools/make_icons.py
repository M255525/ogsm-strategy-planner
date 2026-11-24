# 產生 PWA 圖示：海圖紙＋羅盤玫瑰（北方洋紅、其餘深海藍與黃銅），程式自繪
import math, os
from PIL import Image, ImageDraw

SEA, PAPER, BRASS, ROUTE = '#16324F', '#FBF6E8', '#A87A28', '#9B2F63'
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons')
os.makedirs(out, exist_ok=True)


def draw(size, pad):
    s = 4 * size
    im = Image.new('RGB', (s, s), SEA)
    d = ImageDraw.Draw(im)
    c = s / 2
    R = (0.5 - pad) * s
    # 海圖經緯線
    for i in range(1, 8):
        v = s * i / 8
        d.line([(v, 0), (v, s)], fill='#24466A', width=max(1, s // 220))
        d.line([(0, v), (s, v)], fill='#24466A', width=max(1, s // 220))
    d.ellipse([c - R, c - R, c + R, c + R], fill=PAPER, outline=BRASS, width=int(R * .07))
    for i in range(32):
        a = math.radians(i * 11.25)
        r0, r1 = R * (.80 if i % 4 else .74), R * .88
        d.line([(c + r0 * math.sin(a), c - r0 * math.cos(a)), (c + r1 * math.sin(a), c - r1 * math.cos(a))], fill=SEA, width=int(R * .018))

    def ray(deg, length, half, l, r):
        a = math.radians(deg)
        def pt(x, y): return (c + x * math.cos(a) - y * math.sin(a), c + x * math.sin(a) + y * math.cos(a))
        d.polygon([pt(0, 0), pt(-half, -half), pt(0, -length)], fill=l)
        d.polygon([pt(0, 0), pt(half, -half), pt(0, -length)], fill=r)
    for k in (45, 135, 225, 315):
        ray(k, R * .52, R * .10, BRASS, '#D9B566')
    for k in (90, 180, 270):
        ray(k, R * .74, R * .14, SEA, '#4A6C8E')
    ray(0, R * .86, R * .15, ROUTE, '#C76A98')
    d.ellipse([c - R * .09, c - R * .09, c + R * .09, c + R * .09], fill=PAPER, outline=SEA, width=int(R * .03))
    return im.resize((size, size), Image.LANCZOS)


draw(192, .07).save(os.path.join(out, 'icon-192.png'))
draw(512, .07).save(os.path.join(out, 'icon-512.png'))
draw(512, .16).save(os.path.join(out, 'icon-maskable-512.png'))
print('ok')
