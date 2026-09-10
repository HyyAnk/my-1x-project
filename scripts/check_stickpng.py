import requests
import re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
r = requests.get('https://www.stickpng.com/search?q=donkey', headers=headers, timeout=10)
print("StickPNG status:", r.status_code)
# look for links or img src
imgs = re.findall(r'https://images\.stickpng\.com/[^"\'<>\s]+\.png', r.text)
links = re.findall(r'/img/[^"\'<>\s]+', r.text)
print("imgs:", len(imgs), "links:", len(links))
for im in imgs[:5]:
    print(" ", im)
for l in links[:5]:
    print(" ", l)
