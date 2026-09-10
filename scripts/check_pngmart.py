import requests
import re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

for tag in ['toy-story', 'kung-fu-panda']:
    url = f"https://www.pngmart.com/image/tag/{tag}"
    r = requests.get(url, headers=headers, timeout=10)
    pngs = list(dict.fromkeys(re.findall(r'https://www\.pngmart\.com/files/\d+/[^"\'<>\s]+\.png', r.text)))
    print(f"[{tag}] status={r.status_code}, found {len(pngs)} unique PNGs")
    for p in pngs:
        print("  ", p)
