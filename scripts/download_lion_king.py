import os
import requests
from PIL import Image
import io

os.makedirs('scripts/candidates', exist_ok=True)
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
session = requests.Session()
session.headers.update(headers)

# Let's inspect lion_king 1 to 30
print("--- Scanning Lion King PNGs ---")
for i in range(1, 31):
    url = f"https://pngimg.com/uploads/lion_king/lion_king_PNG{i}.png"
    try:
        r = session.get(url, timeout=5)
        if r.status_code == 200:
            img = Image.open(io.BytesIO(r.content))
            filename = f"scripts/candidates/lion_king_{i}_{img.width}x{img.height}.png"
            with open(filename, 'wb') as f:
                f.write(r.content)
            print(f"Saved lion_king_{i}: {img.size} mode={img.mode} size={len(r.content)//1024}KB")
    except Exception as e:
        pass
