import os
from PIL import Image, ImageDraw

files = [
    'scripts/candidates/wp_toystory/1343403.jpg',
    'scripts/candidates/wp_woody/2618175.jpg',
    'scripts/candidates/wp_woody/2996251.jpg',
    'scripts/candidates/wp_buzz/1706397.jpg',
    'scripts/candidates/wp_buzz/1706398.jpg',
    'scripts/candidates/wp_po/1309210.jpg',
    'scripts/candidates/wp_po/1309211.jpg',
    'scripts/candidates/wp_po/1309212.jpg',
    'scripts/candidates/wp_lionking/1267820.jpg',
    'scripts/candidates/wp_lionking/1089074.jpg',
]

sheet = Image.new('RGBA', (1500, 600), (240, 240, 240, 255))
draw = ImageDraw.Draw(sheet)

for idx, p in enumerate(files):
    if not os.path.exists(p): continue
    row = idx // 5
    col = idx % 5
    x = col * 300 + 10
    y = row * 300 + 10
    try:
        im = Image.open(p)
        im.thumbnail((280, 250))
        sheet.paste(im, (x + (280 - im.width)//2, y + (250 - im.height)//2))
        draw.text((x + 10, y + 260), f"{os.path.basename(p)} ({im.size})", fill=(0, 0, 0, 255))
    except Exception as e:
        pass

sheet.save('scripts/candidates/sheet_wallpapers.png')
print("Saved sheet_wallpapers.png")
