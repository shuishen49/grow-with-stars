"""把 public/ui 里的 PNG 转成无损 WebP。

无损 WebP = 像素和原来一模一样，只是换了个更会压缩的容器，
所以界面上不会出现任何画质变化；目的是把热更新包从 3.2MB 压到 1.9MB，
让国内网络下的更新时间从三分多钟降到一分多。

用法：python scripts/ui-to-webp.py          （真的转换并删掉 PNG）
      python scripts/ui-to-webp.py --dry    （只看看能省多少）
"""
import os
import sys

from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'ui')
DRY = '--dry' in sys.argv

# 界面里最大显示到多少 CSS 像素（grep 过每个引用处的 h-x/w-x）：
#   导航/分类/统计图标 最大 h-10 = 40px；吉祥物大图 最大 h-28 = 112px。
# 平板常见是 2 倍屏，40px 需要 80 物理像素、112px 需要 224。
# 所以给 192 / 320 —— 即便屏幕到 2.4 倍也还是原图够用，
# 只要「显示像素 ≤ 图源像素」，浏览器本来就是等比缩小绘的，画质不会有变化。
MAX_SIDE = 192
MAX_MASCOT = 320


def target_side(name, w, h):
    limit = MAX_MASCOT if name.startswith('mascot') else MAX_SIDE
    side = max(w, h)
    return min(side, limit)


total_png = total_webp = 0
for name in sorted(os.listdir(ROOT)):
    if not name.lower().endswith('.png'):
        continue
    src_path = os.path.join(ROOT, name)
    dst_path = os.path.join(ROOT, name[:-4] + '.webp')
    src_size = os.path.getsize(src_path)
    total_png += src_size
    with Image.open(src_path) as im:
        im.load()
        w, h = im.size
        side = target_side(name, w, h)
        if side < max(w, h):
            im = im.resize((round(w * side / max(w, h)), round(h * side / max(w, h))), Image.LANCZOS)
        if not DRY:
            im.save(dst_path, 'WEBP', lossless=True, method=6)
    dst_size = os.path.getsize(dst_path) if not DRY else 0
    total_webp += dst_size
    flag = '（未落盘）' if DRY else ''
    print(f'{name:<28}{w}x{h:<6}{src_size/1024:>7.0f}K -> {dst_size/1024:>7.0f}K {flag}')
    if not DRY:
        os.remove(src_path)

unit = 1024 * 1024
print('-' * 60)
print(f'PNG 合计 {total_png/unit:.2f} MB → WebP 合计 {total_webp/unit:.2f} MB'
      if not DRY else f'PNG 合计 {total_png/unit:.2f} MB')
