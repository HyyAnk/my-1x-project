import requests
import re

session = requests.Session()
session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})

# Check toy story variations on pngimg
test_folders = [
    'toy_story', 'toystory', 'woody', 'buzz', 'buzz_lightyear',
    'toy_story_woody', 'toy_story_buzz', 'toys', 'disney', 'pixar'
]

for tf in test_folders:
    for prefix in [tf, 'toy_story', 'woody', 'buzz', 'pixar', 'disney']:
        for i in [1, 2]:
            url = f"https://pngimg.com/uploads/{tf}/{prefix}_PNG{i}.png"
            try:
                r = session.head(url, timeout=1.5, allow_redirects=True)
                if r.status_code == 200:
                    print(f"Found: {url} ({r.headers.get('Content-Length')} bytes)")
            except:
                pass
