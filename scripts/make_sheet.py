import os
from PIL import Image, ImageDraw, ImageFont

files = sorted([f for f in os.listdir('scripts/candidates') if f.startswith('lion_king_')], 
               key=lambda x: int(x.split('_')[2]))

# Let's create two contact sheets: 1-15 and 16-30
for sheet_idx, chunk in enumerate([files[:15], files[15:]]):
    sheet = Image.new('RGBA', (1500, 900), (240, 240, 240, 255))
    draw = ImageDraw.Draw(sheet)
    for i, fname in enumerate(chunk):
        row = i // 5
        col = i % 5
        x = col * 300 + 10
        y = row * 300 + 10
        img_path = os.path.join('scripts/candidates', fname)
        try:
            im = Image.open(img_path).convert('RGBA')
            im.thumbnail((280, 250))
            sheet.paste(im, (x + (280 - im.width)//2, y + (250 - im.height)//2), im)
        except Exception as e:
            pass
        num = fname.split('_')[2]
        draw.text((x + 10, y + 260), f"#{num}: {fname}", fill=(0, 0, 0, 255))
    sheet.save(f'scripts/candidates/sheet_{sheet_idx+1}.png')
print("Contact sheets created")
