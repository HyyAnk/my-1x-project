import urllib.request
import re
import json

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

def search_pngimg(query):
    url = f'https://pngimg.com/search/?text={query}'
    req = urllib.request.Request(url, headers=headers)
    try:
        html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8')
        pngs = re.findall(r'(https://pngimg\.com/uploads/[^"\']+\.png)', html)
        return list(set(pngs))
    except Exception as e:
        print(f"Error for {query}: {e}")
        return []

queries = ['shrek', 'donkey', 'simba', 'mufasa', 'lion_king', 'woody', 'buzz_lightyear', 'kung_fu_panda']
for q in queries:
    results = search_pngimg(q)
    print(f"Query: {q} -> Found {len(results)} pngs")
    for r in results[:3]:
        print(f"   {r}")
