# 生成安卓自适应图标（adaptive icon）的前景/背景素材。
#
# 背景：logo 是一张「紫色圆角方块 + 金色勋章」的整图。直接把它塞进
#       ic_launcher_foreground 会出问题 —— 自适应图标只显示画布中央约
#       72/108 的区域，勋章会被放大到撑满、紫底只剩四个角。
# 正确做法：前景只放勋章（透明底、缩进安全区），背景用纯色补齐。
#
# 用法：
#   python scripts/gen-adaptive-icons.py <勋章整图logo.png> <android项目res目录>
# 依赖：pip install pillow
from PIL import Image, ImageDraw
import os
import sys

SRC = sys.argv[1] if len(sys.argv) > 1 else 'logo-1024.png'
RES = sys.argv[2] if len(sys.argv) > 2 else 'android/app/src/main/res'

# ---- 1. 从整图里抠出勋章（去掉紫色底）----
im = Image.open(SRC).convert('RGBA')
w, h = im.size
px = im.load()
# 采样出现最多的颜色当紫底色
from collections import Counter
c = Counter()
for y in range(0, h, 4):
    for x in range(0, w, 4):
        r, g, b, a = px[x, y]
        if a > 200:
            c[(r, g, b)] += 1
TILE_RGB = c.most_common(1)[0][0]

# 勋章全是金/黄/米色（R > B），紫底和紫底抗锯齿留下的淡紫边都是 B > R，
# 一个不等式就能把底和「幽灵边」一起干掉。
medal = Image.new('RGBA', (w, h), (0, 0, 0, 0))
mp = medal.load()
minx, miny, maxx, maxy = w, h, 0, 0
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a == 0:
            continue
        if b < r - 8:
            mp[x, y] = (r, g, b, 255)
            minx, miny = min(minx, x), min(miny, y)
            maxx, maxy = max(maxx, x), max(maxy, y)
medal = medal.crop((minx, miny, maxx + 1, maxy + 1))
print(f'勋章裁出: {medal.size[0]}x{medal.size[1]}，紫底 #%02X%02X%02X' % TILE_RGB)

# ---- 2. 前景：108dp 网格，勋章占画布 46% ----
# 46% × 画布 ≈ 可见区(72dp) 的 69%，与原 logo 里勋章占比基本一致；
# 且包围盒半对角 31.9dp < 安全区半径 33dp，任何蒙版都不会裁到。
RATIO = 0.46
GRID = {'mdpi': 108, 'hdpi': 162, 'xhdpi': 216, 'xxhdpi': 324, 'xxxhdpi': 432}
for d, size in GRID.items():
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    t = round(size * RATIO)
    m = medal.resize((t, t), Image.LANCZOS)
    canvas.paste(m, ((size - t) // 2, (size - t) // 2), m)
    canvas.save(os.path.join(RES, f'mipmap-{d}', 'ic_launcher_foreground.png'), 'PNG', optimize=True)

# ---- 3. 传统图标（Android 8 以下）：整张紫底圆角方块 ----
LEGACY = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
for d, size in LEGACY.items():
    tile = im.resize((size, size), Image.LANCZOS)
    for name in ('ic_launcher.png', 'ic_launcher_round.png'):
        tile.save(os.path.join(RES, f'mipmap-{d}', name), 'PNG', optimize=True)

# ---- 4. 背景色 ----
xml = os.path.join(RES, 'values', 'ic_launcher_background.xml')
with open(xml, 'w', encoding='utf-8') as f:
    f.write(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        '    <!-- 由 scripts/gen-adaptive-icons.py 从 logo 实测生成 -->\n'
        f'    <color name="ic_launcher_background">#%02X%02X%02X</color>\n'
        '</resources>\n' % TILE_RGB
    )
print('完成：前景 / 传统图标 / 背景色已全部写出')
