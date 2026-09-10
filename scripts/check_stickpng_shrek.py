import requests, re

headers = {'User-Agent': 'Mozilla/5.0'}
for path in ['/cat/cartoons/shrek', '/img/cartoons/shrek']:
    url = f"https://www.stickpng.com{path}"
    r = requests.get(url, headers=headers, timeout=10)
    print(path, r.status_code)
    links = set(re.findall(r'/img/cartoons/shrek/[^"\'<>\s]+', r.text))
    print(f"  found {len(links)} links")
    for l in links:
        print("   ", l)
