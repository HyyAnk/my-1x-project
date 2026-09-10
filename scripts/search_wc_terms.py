import urllib.request
import urllib.parse
import re

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
}

def search_wc(term):
    url = f"https://wallpapercave.com/search?q={urllib.parse.quote(term)}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            # find album links
            albums = re.findall(r'href="(/[^"/]+-wallpapers|/w/[^"]+)"', html)
            return list(dict.fromkeys(albums))
    except Exception as e:
        return []

terms = [
    "terminator", "sarah connor", "ellen ripley", "matrix neo", "morpheus matrix",
    "marty mcfly", "doc brown", "rocky balboa", "rambo", "james bond",
    "indiana jones", "jack sparrow", "rubiks cube", "monopoly", "scrabble", "uno cards"
]

for t in terms:
    res = search_wc(t)
    print(f"Term: {t} -> {res[:4]}")
