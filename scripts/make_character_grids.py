import os
from PIL import Image, ImageDraw

def create_grid(image_list, out_path, title):
    W, H = 1400, 400
    sheet = Image.new('RGBA', (W, H), (235, 240, 245, 255))
    draw = ImageDraw.Draw(sheet)
    col_w = W // len(image_list)
    for idx, (path, label) in enumerate(image_list):
        if not os.path.exists(path):
            continue
        try:
            im = Image.open(path).convert('RGBA')
            im.thumbnail((col_w - 20, H - 70))
            x = idx * col_w + (col_w - im.width) // 2
            y = 40 + (H - 70 - im.height) // 2
            sheet.paste(im, (x, y), im)
            draw.text((idx * col_w + 15, H - 25), f"{label} ({im.size})", fill=(0, 0, 0, 255))
        except Exception as e:
            print(f"Error {path}: {e}")
    draw.text((20, 10), title, fill=(20, 20, 100, 255))
    sheet.save(out_path)
    print(f"Saved {out_path}")

create_grid([
    ('scripts/candidates/shrek_1.png', 'shrek_1'),
    ('scripts/candidates/shrek_2.png', 'shrek_2'),
    ('scripts/candidates/shrek_4.png', 'shrek_4'),
    ('scripts/candidates/shrek_9.png', 'shrek_9'),
], 'scripts/candidates/grid_shrek.png', 'Shrek Candidates')

create_grid([
    ('scripts/candidates/donkey_1.png', 'donkey_1'),
    ('scripts/candidates/donkey_3.png', 'donkey_3'),
    ('scripts/candidates/donkey_4.png', 'donkey_4'),
    ('scripts/candidates/donkey_5.png', 'donkey_5'),
], 'scripts/candidates/grid_donkey.png', 'Donkey Candidates')

create_grid([
    ('scripts/candidates/woody_1.png', 'woody_1'),
    ('scripts/candidates/woody_2.png', 'woody_2'),
    ('scripts/candidates/woody_3.png', 'woody_3'),
    ('scripts/candidates/woody_4.png', 'woody_4'),
], 'scripts/candidates/grid_woody.png', 'Woody Candidates')

create_grid([
    ('scripts/candidates/buzz_1.png', 'buzz_1'),
    ('scripts/candidates/buzz_2.png', 'buzz_2'),
    ('scripts/candidates/buzz_3.png', 'buzz_3'),
    ('scripts/candidates/buzz_4.png', 'buzz_4'),
], 'scripts/candidates/grid_buzz.png', 'Buzz Lightyear Candidates')

create_grid([
    ('scripts/candidates/po_1.png', 'po_1'),
    ('scripts/candidates/po_2.png', 'po_2'),
    ('scripts/candidates/po_3.png', 'po_3'),
    ('scripts/candidates/po_4.png', 'po_4'),
], 'scripts/candidates/grid_po.png', 'Po Candidates')

create_grid([
    ('scripts/candidates/lion_king_1_939x778.png', 'simba_adult_1'),
    ('scripts/candidates/lion_king_18_2024x1991.png', 'simba_cub_18'),
    ('scripts/candidates/lion_king_8_1215x1170.png', 'mufasa_8'),
    ('scripts/candidates/lion_king_25_659x606.png', 'scar_25'),
    ('scripts/candidates/scar_4.png', 'scar_4'),
], 'scripts/candidates/grid_lionking.png', 'Lion King Candidates (Simba, Mufasa, Scar)')
