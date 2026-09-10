import urllib.request
import urllib.parse
import re
from PIL import Image
import io

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9'
}

def search_bing_images(query, filter_type="wallpaper"):
    q_encoded = urllib.parse.quote(query)
    # qft filter
    qft = ""
    if filter_type == "wallpaper":
        qft = "&qft=+filterui:imagesize-wallpaper"
    elif filter_type == "large":
        qft = "&qft=+filterui:imagesize-large"
    elif filter_type == "transparent":
        qft = "&qft=+filterui:photo-transparent"
        
    url = f"https://www.bing.com/images/search?q={q_encoded}{qft}&FORM=HDRSC2"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            murls = re.findall(r'murl&quot;:&quot;(http[^&]+)&quot;', html)
            if not murls:
                murls = re.findall(r'"murl":"(http[^"]+)"', html)
            return murls
    except Exception as e:
        print(f"Bing search error for '{query}': {e}")
        return []

def test_fetch_image(url):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
            img = Image.open(io.BytesIO(data))
            return img.size, len(data), img.format
    except Exception as e:
        return None, 0, str(e)

if __name__ == '__main__':
    urls = search_bing_images("The Terminator T-800 Arnold Schwarzenegger wallpaper 1080p", "wallpaper")
    print(f"Found {len(urls)} URLs")
    for u in urls[:5]:
        size, byte_len, fmt = test_fetch_image(u)
        print(f"URL: {u[:80]}... -> Size: {size}, Bytes: {byte_len}, Fmt: {fmt}")
