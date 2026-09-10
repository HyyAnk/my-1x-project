import requests
import re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
url = 'https://www.cleanpng.com/free/shrek-donkey.html'
try:
    r = requests.get(url, headers=headers, timeout=10)
    print("CleanPNG status:", r.status_code)
    # find image preview or download links
    imgs = re.findall(r'https://[^"\'<>\s]+\.cleanpng\.com/[^"\'<>\s]+\.(?:png|jpg|webp)', r.text)
    print("CleanPNG images:", len(imgs))
    for im in list(dict.fromkeys(imgs))[:10]:
        print(" ", im)
except Exception as e:
    print("CleanPNG error:", e)
