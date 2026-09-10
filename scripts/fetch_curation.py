import os
import json
import re
import urllib.request
import urllib.parse
from PIL import Image

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
}

def search_ddg_images(query):
    init_url = f"https://duckduckgo.com/?q={urllib.parse.quote(query)}"
    req = urllib.request.Request(init_url, headers=HEADERS)
    try:
        html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8')
        vqd_match = re.search(r'vqd=([0-9-]+)', html) or re.search(r'vqd=[\'"]([0-9-]+)[\'"]', html) or re.search(r'vqd="([^"]+)"', html)
        if not vqd_match:
            print(f"No vqd found for query: {query}")
            return []
        vqd = vqd_match.group(1)
        api_url = f"https://duckduckgo.com/i.js?l=us-en&o=json&q={urllib.parse.quote(query)}&vqd={vqd}"
        req_img = urllib.request.Request(api_url, headers=HEADERS)
        data = json.loads(urllib.request.urlopen(req_img, timeout=10).read().decode('utf-8'))
        return data.get('results', [])
    except Exception as e:
        print(f"Error fetching DDG images for {query}: {e}")
        return []

if __name__ == '__main__':
    results = search_ddg_images("The Terminator T-800 Arnold Schwarzenegger wallpaper 1080p")
    print(f"Found {len(results)} results")
    for r in results[:5]:
        print("---")
        print("Title:", r.get('title'))
        print("Image:", r.get('image'))
        print("Dimensions:", r.get('width'), "x", r.get('height'))
