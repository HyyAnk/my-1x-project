import os
import requests
from PIL import Image, ImageDraw

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
session = requests.Session()
session.headers.update(headers)

scar_urls = [
    'https://www.pngmart.com/files/23/Scar-PNG.png',
    'https://www.pngmart.com/files/23/Scar-PNG-HD-Isolated.png',
    'https://www.pngmart.com/files/23/Scar-PNG-Photo.png',
    'https://www.pngmart.com/files/23/Scar-PNG-Image.png',
    'https://www.pngmart.com/files/23/Scar-PNG-Picture.png',
    'https://www.pngmart.com/files/23/Scar-PNG-Transparent.png'
]

for idx, u in enumerate(scar_urls):
    dest = f"scripts/candidates/scar_{idx+1}.png"
    try:
        r = session.get(u, timeout=10)
        if r.status_code == 200:
            with open(dest, 'wb') as f:
                f.write(r.content)
            im = Image.open(dest)
            print(f"Downloaded scar_{idx+1}: {im.size} {len(r.content)//1024}KB")
    except Exception as e:
        print(f"Error {u}: {e}")
