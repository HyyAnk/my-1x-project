import requests, re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
url = 'https://wallpaperaccess.com/shrek-and-donkey'
try:
    r = requests.get(url, headers=headers, timeout=10)
    print("status:", r.status_code)
    imgs = re.findall(r'/full/\d+\.(?:jpg|png)', r.text)
    print("Found wallpapers:", len(imgs))
    for im in list(dict.fromkeys(imgs))[:10]:
        print("https://wallpaperaccess.com" + im)
except Exception as e:
    print("Error:", e)
