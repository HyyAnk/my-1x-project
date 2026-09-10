import urllib.request
import urllib.parse
import json
import re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}

def search_duckduckgo_images(query):
    # DDG image search
    url = f"https://duckduckgo.com/i.js?l=us-en&o=json&q={urllib.parse.quote(query)}&vqd="
    # First get vqd token
    init_url = f"https://duckduckgo.com/?q={urllib.parse.quote(query)}"
    req = urllib.request.Request(init_url, headers=headers)
    try:
        html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8')
        vqd_match = re.search(r'vqd=([0-9-]+)', html) or re.search(r'vqd=[\'"]([0-9-]+)[\'"]', html) or re.search(r'vqd="([^"]+)"', html)
        if not vqd_match:
            print(f"No vqd token for {query}")
            return []
        vqd = vqd_match.group(1)
        req_img = urllib.request.Request(f"https://duckduckgo.com/i.js?l=us-en&o=json&q={urllib.parse.quote(query)}&vqd={vqd}", headers=headers)
        data = json.loads(urllib.request.urlopen(req_img, timeout=10).read())
        return data.get('results', [])
    except Exception as e:
        print(f"DDG Error: {e}")
        return []

res = search_duckduckgo_images("Shrek character transparent background png")
print("Found results:", len(res))
for r in res[:3]:
    print("Title:", r.get('title'))
    print("Image:", r.get('image'))
    print("Width:", r.get('width'), "Height:", r.get('height'))
