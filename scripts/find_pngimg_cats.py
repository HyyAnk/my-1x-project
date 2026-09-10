import urllib.request
import re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

# Let's check pngimg category pages
categories = [
    'shrek',
    'lion_king',
    'toy_story',
    'kung_fu_panda',
    'panda',
    'lion',
    'donkey',
    'woody',
    'buzz_lightyear',
    'buzz',
    'disney'
]

found_categories = {}

for cat in categories:
    url = f'https://pngimg.com/images/cartoons/{cat}/'
    url2 = f'https://pngimg.com/images/heroes/{cat}/'
    url3 = f'https://pngimg.com/images/movies/{cat}/'
    url4 = f'https://pngimg.com/images/animals/{cat}/'
    url5 = f'https://pngimg.com/images/anime/{cat}/'
    for u in [url, url2, url3, url4, url5]:
        try:
            req = urllib.request.Request(u, headers=headers)
            html = urllib.request.urlopen(req, timeout=5).read().decode('utf-8')
            pngs = re.findall(r'/uploads/[^"\']+\.png', html)
            if pngs:
                print(f"Found category: {u} -> {len(pngs)} images")
                found_categories[cat] = [f"https://pngimg.com{p}" for p in pngs]
                break
        except Exception:
            pass

# Also check https://pngimg.com/category/
for cat in ['shrek', 'lion_king', 'toy_story', 'kung_fu_panda', 'lion', 'donkey']:
    if cat not in found_categories:
        try:
            u = f'https://pngimg.com/category/{cat}'
            req = urllib.request.Request(u, headers=headers)
            html = urllib.request.urlopen(req, timeout=5).read().decode('utf-8')
            pngs = re.findall(r'/uploads/[^"\']+\.png', html)
            if pngs:
                print(f"Found category at /category/: {u} -> {len(pngs)} images")
                found_categories[cat] = [f"https://pngimg.com{p}" for p in pngs]
        except Exception:
            pass
