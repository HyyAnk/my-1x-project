import os
from PIL import Image, ImageDraw

files = sorted(os.listdir('scripts/candidates/wp_donkey'))
sheet = Image.new('RGBA', (1500, 600), (240, 240, 240, 255))
draw = ImageDraw.Draw(sheet)

for idx, f in enumerate(files):
    if idx >= 10: break
    row = idx // 5
    col = idx % 5
    x = col * 300 + 10
    y = row * 300 + 10
    path = os.path.join('scripts/candidates/wp_donkey', f)
    try:
        im = Image.open(path)
        im.thumbnail((280, 250))
        sheet.paste(im, (x + (280 - im.width)//2, y + (250 - im.height)//2))
        draw.text((x + 10, y + 260), f"{f} ({im.size})", fill=(0, 0, 0, 255))
    except Exception as e:
        pass

sheet.save('scripts/candidates/sheet_wp_donkey.png')
print("Saved sheet_wp_donkey.png")
