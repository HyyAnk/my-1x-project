import urllib.request
import urllib.parse
import re

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

def search_wc(q):
    url = f"https://wallpapercave.com/search?q={urllib.parse.quote(q)}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            albums = re.findall(r'href="(/[^"/]+-wallpapers|/w/[^"]+)"', html)
            return list(dict.fromkeys(albums))
    except Exception as e:
        return []

for q in ["sigourney weaver", "ripley", "alien 1979", "alien isolation"]:
    res = search_wc(q)
    print(q, res[:5])
