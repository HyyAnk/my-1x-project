import urllib.request
import urllib.parse
import json
import re

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
}

def search_bing(query):
    # Bing search for image urls
    url = f"https://www.bing.com/images/search?q={urllib.parse.quote(query)}&FORM=HDRSC2"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            # Look for murl in bing image search
            murls = re.findall(r'murl&quot;:&quot;(http[^&]+)&quot;', html)
            if not murls:
                murls = re.findall(r'"murl":"(http[^"]+)"', html)
            return murls
    except Exception as e:
        print(f"Bing search error: {e}")
        return []

if __name__ == '__main__':
    for q in ['The Terminator T-800 Arnold Schwarzenegger wallpaper 1080p', 'Marty McFly Back to the Future wallpaper 1080p']:
        murls = search_bing(q)
        print(f"Query '{q}': found {len(murls)} images")
        for u in murls[:3]:
            print("  ", u)
