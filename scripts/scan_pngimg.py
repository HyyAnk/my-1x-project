import requests

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

folders = [
    ('shrek', 'shrek_PNG', 15),
    ('donkey', 'donkey_PNG', 20),
    ('lion_king', 'lion_king_PNG', 30),
    ('simba', 'simba_PNG', 10),
    ('toy_story', 'toy_story_PNG', 30),
    ('woody', 'woody_PNG', 20),
    ('buzz_lightyear', 'buzz_lightyear_PNG', 20),
    ('buzz', 'buzz_PNG', 20),
    ('kung_fu_panda', 'kung_fu_panda_PNG', 30),
    ('panda', 'panda_PNG', 20),
]

session = requests.Session()
session.headers.update(headers)

for folder, prefix, max_idx in folders:
    found = []
    for i in range(1, max_idx + 1):
        url = f"https://pngimg.com/uploads/{folder}/{prefix}{i}.png"
        try:
            r = session.head(url, timeout=2.5, allow_redirects=True)
            if r.status_code == 200:
                length = int(r.headers.get('Content-Length', 0))
                found.append((url, length))
        except Exception:
            pass
    if found:
        print(f"[{folder}] found {len(found)} PNGs:")
        for u, sz in found[:5]:
            print(f"   {u} ({sz // 1024} KB)")
