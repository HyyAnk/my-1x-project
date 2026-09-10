import requests, re

headers = {'User-Agent': 'Mozilla/5.0'}
url = 'https://www.freeiconspng.com/img/47505'
r = requests.get(url, headers=headers, timeout=10)
print("status:", r.status_code)
imgs = re.findall(r'https://www\.freeiconspng\.com/uploads/[^"\'<>\s]+\.png', r.text)
for im in imgs:
    print("img:", im)
