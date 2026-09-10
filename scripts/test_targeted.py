import urllib.request
import urllib.parse
import re
from PIL import Image
import io

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
}

def search_bing_targeted(query):
    q_encoded = urllib.parse.quote(query)
    url = f"https://www.bing.com/images/search?q={q_encoded}&FORM=HDRSC2"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            murls = re.findall(r'murl&quot;:&quot;(http[^&]+)&quot;', html)
            if not murls:
                murls = re.findall(r'"murl":"(http[^"]+)"', html)
            return murls
    except Exception as e:
        print(f"Bing search error: {e}")
        return []

if __name__ == '__main__':
    urls = search_bing_targeted("site:alphacoders.com The Terminator Arnold Schwarzenegger 1920x1080")
    print(f"Alphacoders query: {len(urls)} URLs")
    for u in urls[:5]:
        print("  ", u)
    urls2 = search_bing_targeted("site:themoviedb.org Back to the Future Marty McFly backdrop")
    print(f"TMDB query: {len(urls2)} URLs")
    for u in urls2[:5]:
        print("  ", u)
