import urllib.request
import re
import json

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'}

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

queries = ['terminator', 'matrix', 'rocky', 'rambo', 'james_bond', 'indiana_jones', 'jack_sparrow', 'rubik', 'monopoly', 'scrabble', 'uno']
for q in queries:
    res = search_pngimg(q)
    print(f"{q}: {len(res)} results -> {res[:2]}")
