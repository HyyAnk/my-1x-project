import urllib.request
import re
import json

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}

def get_alphacoders_images(url):
    req = urllib.request.Request(url, headers=headers)
    try:
        html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8')
        imgs = re.findall(r'(https://images\d?\.alphacoders\.com/[^"\'<>\s]+\.(?:jpg|png))', html)
        return list(dict.fromkeys(imgs))
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return []

url = 'https://wall.alphacoders.com/by_sub_category.php?id=184318&name=Shrek+Wallpapers'
found = get_alphacoders_images(url)
print(f"Found {len(found)} images:")
for f in found[:5]:
    print(" ", f)
