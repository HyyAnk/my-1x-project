import requests, re, os
from PIL import Image

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
session = requests.Session()
session.headers.update(headers)

topics = [
    ('toy-story', 'wp_toystory'),
    ('woody', 'wp_woody'),
    ('buzz-lightyear', 'wp_buzz'),
    ('kung-fu-panda', 'wp_po'),
    ('the-lion-king', 'wp_lionking'),
    ('scar-lion-king', 'wp_scar')
]

for topic, folder in topics:
    os.makedirs(f'scripts/candidates/{folder}', exist_ok=True)
    url = f"https://wallpaperaccess.com/{topic}"
    try:
        r = session.get(url, timeout=8)
        if r.status_code == 200:
            ids = list(dict.fromkeys(re.findall(r'/full/(\d+)\.(?:jpg|png)', r.text)))
            print(f"[{topic}] found {len(ids)} wallpapers")
            for wp_id in ids[:4]:
                wp_url = f"https://wallpaperaccess.com/full/{wp_id}.jpg"
                dest = f"scripts/candidates/{folder}/{wp_id}.jpg"
                if not os.path.exists(dest):
                    try:
                        r_img = session.get(wp_url, timeout=8)
                        if r_img.status_code == 200:
                            with open(dest, 'wb') as f:
                                f.write(r_img.content)
                            im = Image.open(dest)
                            print(f"  {folder}/{wp_id}: {im.size}")
                    except Exception:
                        pass
    except Exception as e:
        print(f"Error {topic}: {e}")
