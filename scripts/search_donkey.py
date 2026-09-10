import requests
import re

headers = {'User-Agent': 'Mozilla/5.0'}
r = requests.get('https://www.pngmart.com/search?s=donkey', headers=headers, timeout=10)
pngs = list(dict.fromkeys(re.findall(r'https://www\.pngmart\.com/files/\d+/[^"\'<>\s]+\.png', r.text)))
print('PNGMart donkey search:', len(pngs))
for p in pngs:
    print(' ', p)
