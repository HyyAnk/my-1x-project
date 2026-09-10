from PIL import Image, ImageDraw

sheet = Image.new('RGBA', (1500, 900), (240, 240, 240, 255))
draw = ImageDraw.Draw(sheet)
for i in range(1, 16):
    idx = i - 1
    row = idx // 5
    col = idx % 5
    x = col * 300 + 10
    y = row * 300 + 10
    fname = f"scripts/candidates/shrek_all_{i}.png"
    try:
        im = Image.open(fname).convert('RGBA')
        im.thumbnail((280, 250))
        sheet.paste(im, (x + (280 - im.width)//2, y + (250 - im.height)//2), im)
        draw.text((x + 10, y + 260), f"shrek_{i} ({im.width}x{im.height})", fill=(0, 0, 0, 255))
    except Exception as e:
        pass
sheet.save('scripts/candidates/sheet_shrek_all.png')
print("Saved sheet_shrek_all.png")
