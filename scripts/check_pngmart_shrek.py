import requests, re

headers = {'User-Agent': 'Mozilla/5.0'}
for tag in ['shrek', 'donkey-shrek']:
    url = f"https://www.pngmart.com/image/tag/{tag}"
    r = requests.get(url, headers=headers, timeout=10)
    pngs = list(dict.fromkeys(re.findall(r'https://www\.pngmart\.com/files/\d+/[^"\'<>\s]+\.png', r.text)))
    print(f"[{tag}] status={r.status_code}, found {len(pngs)} PNGs")
    for p in pngs:
        if 'donkey' in p.lower() or 'shrek' in p.lower():
            print("  ", p)
