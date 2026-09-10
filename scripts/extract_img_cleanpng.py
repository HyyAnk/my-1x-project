import requests, re
headers = {'User-Agent': 'Mozilla/5.0'}
r = requests.get('https://www.cleanpng.com/free/shrek-donkey.html', headers=headers, timeout=10)
srcs = re.findall(r'<img[^>]+src=[\'"]([^\'"]+)[\'"]', r.text)
for s in srcs[:10]:
    print("img src:", s)
