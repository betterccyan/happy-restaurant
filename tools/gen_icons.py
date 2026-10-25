# 生成「幸福小馆」App 图标（澎湃OS 4 柔光玻璃风格）
# 用法: python tools/gen_icons.py
import math
import os
from PIL import Image, ImageDraw, ImageFilter, ImageChops

RES = os.path.join(os.path.dirname(__file__), '..', 'android', 'app', 'src', 'main', 'res')

BASE = 1024
BLUE_TOP = (77, 141, 247)
BLUE_MID = (44, 123, 242)
BLUE_BOT = (26, 95, 208)


def bowl_mask(S=BASE):
    """碗 + 蒸汽的灰度遮罩"""
    k = S / 1024.0
    mask = Image.new('L', (S, S), 0)
    md = ImageDraw.Draw(mask)

    cx = S / 2
    rim_cy = 560 * k
    rx = 276 * k
    ry = 66 * k

    # 碗身：以碗口为圆心的下半圆
    md.pieslice([cx - rx, rim_cy - rx, cx + rx, rim_cy + rx], 0, 180, fill=255)
    # 挖掉碗口内壁
    md.ellipse(
        [cx - rx * 0.87, rim_cy - ry * 0.92, cx + rx * 0.87, rim_cy + ry * 0.70],
        fill=0,
    )
    # 碗口外沿
    md.ellipse([cx - rx, rim_cy - ry, cx + rx, rim_cy + ry], outline=255, width=int(32 * k))

    # 蒸汽：三条 S 形曲线
    steam = Image.new('L', (S, S), 0)
    sd = ImageDraw.Draw(steam)
    for i, x0 in enumerate([cx - 128 * k, cx, cx + 128 * k]):
        pts = []
        top = 318 * k
        bottom = 448 * k
        amp = 24 * k
        phase = i * 2.1
        steps = 24
        for s in range(steps + 1):
            t = s / steps
            y = bottom - (bottom - top) * t
            x = x0 + math.sin(t * math.pi * 1.6 + phase) * amp * (0.35 + 0.65 * t)
            pts.append((x, y))
        w = int(30 * k)
        sd.line(pts, fill=255, width=w, joint='curve')
        for p in (pts[0], pts[-1]):
            r = w / 2
            sd.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=255)

    return ImageChops.lighter(mask, steam)


def draw_bowl(size=BASE, color=(255, 255, 255, 255)):
    m = bowl_mask(size)
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    img.paste(Image.new('RGBA', (size, size), color), (0, 0), m)
    return img


def gradient_bg(size):
    """蓝色纵向渐变 + 顶部柔光"""
    img = Image.new('RGB', (size, size), BLUE_TOP)
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / max(1, size - 1)
        if t < 0.5:
            f = t / 0.5
            c = tuple(int(BLUE_TOP[i] + (BLUE_MID[i] - BLUE_TOP[i]) * f) for i in range(3))
        else:
            f = (t - 0.5) / 0.5
            c = tuple(int(BLUE_MID[i] + (BLUE_BOT[i] - BLUE_MID[i]) * f) for i in range(3))
        d.line([(0, y), (size, y)], fill=c)

    glow = Image.new('L', (size, size), 0)
    gd = ImageDraw.Draw(glow)
    gd.ellipse([-size * 0.24, -size * 0.54, size * 1.0, size * 0.34], fill=64)
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.09))
    img.paste(Image.new('RGB', (size, size), (255, 255, 255)), (0, 0), glow)
    return img


def squircle_mask(size, radius_ratio=0.235):
    m = Image.new('L', (size * 4, size * 4), 0)
    d = ImageDraw.Draw(m)
    r = int(size * 4 * radius_ratio)
    d.rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=r, fill=255)
    return m.resize((size, size), Image.LANCZOS)


def circle_mask(size):
    m = Image.new('L', (size * 4, size * 4), 0)
    d = ImageDraw.Draw(m)
    d.ellipse([0, 0, size * 4 - 1, size * 4 - 1], fill=255)
    return m.resize((size, size), Image.LANCZOS)


def make_legacy(size, round_icon=False):
    bg = gradient_bg(size).convert('RGBA')
    inner = int(size * 0.62)
    bowl = draw_bowl(inner)
    off = (size - inner) // 2
    bg.paste(bowl, (off, off), bowl)
    mask = circle_mask(size) if round_icon else squircle_mask(size)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(bg, (0, 0), mask)
    return out


def make_foreground(size):
    inner = int(size * 0.63)
    bowl = draw_bowl(inner)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    off = (size - inner) // 2
    out.paste(bowl, (off, off), bowl)
    return out


DENSITIES = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}

for name, mult in DENSITIES.items():
    folder = os.path.join(RES, 'mipmap-' + name)
    os.makedirs(folder, exist_ok=True)
    s = int(48 * mult)
    make_legacy(s).save(os.path.join(folder, 'ic_launcher.png'))
    make_legacy(s, round_icon=True).save(os.path.join(folder, 'ic_launcher_round.png'))
    fg = int(108 * mult)
    make_foreground(fg).save(os.path.join(folder, 'ic_launcher_foreground.png'))
    print('wrote', folder, s, fg)

make_legacy(512).save(os.path.join(os.path.dirname(__file__), '..', 'icon-preview.png'))
print('done')
