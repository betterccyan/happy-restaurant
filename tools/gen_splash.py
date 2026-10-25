# 生成启动画面 splash.png（浅灰底 + 居中蓝色图标）
import os
from PIL import Image
from gen_icons import make_legacy

RES = os.path.join(os.path.dirname(__file__), '..', 'android', 'app', 'src', 'main', 'res')
BG = (239, 242, 247)

SIZES = {
    'drawable': (320, 480),
    'drawable-port-mdpi': (320, 480),
    'drawable-port-hdpi': (480, 800),
    'drawable-port-xhdpi': (640, 960),
    'drawable-port-xxhdpi': (960, 1440),
    'drawable-port-xxxhdpi': (1280, 1920),
    'drawable-land-mdpi': (480, 320),
    'drawable-land-hdpi': (800, 480),
    'drawable-land-xhdpi': (960, 640),
    'drawable-land-xxhdpi': (1440, 960),
    'drawable-land-xxxhdpi': (1920, 1280),
}

for folder, (w, h) in SIZES.items():
    d = os.path.join(RES, folder)
    os.makedirs(d, exist_ok=True)
    canvas = Image.new('RGB', (w, h), BG)
    icon_side = int(min(w, h) * 0.30)
    icon = make_legacy(icon_side).convert('RGBA')
    canvas = canvas.convert('RGBA')
    canvas.paste(icon, ((w - icon_side) // 2, (h - icon_side) // 2 - int(min(w, h) * 0.03)), icon)
    canvas.convert('RGB').save(os.path.join(d, 'splash.png'))
    print('splash', folder, w, h)

print('done')
