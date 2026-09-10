import urllib.request

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

test_urls = [
    # Shrek
    'https://pngimg.com/uploads/shrek/shrek_PNG1.png',
    'https://pngimg.com/uploads/shrek/shrek_PNG2.png',
    'https://pngimg.com/uploads/shrek/shrek_PNG3.png',
    'https://pngimg.com/uploads/shrek/shrek_PNG4.png',
    'https://pngimg.com/uploads/shrek/shrek_PNG5.png',
    'https://pngimg.com/uploads/shrek/shrek_PNG6.png',
    'https://pngimg.com/uploads/shrek/shrek_PNG7.png',
    'https://pngimg.com/uploads/shrek/shrek_PNG8.png',
    'https://pngimg.com/uploads/shrek/shrek_PNG9.png',
    'https://pngimg.com/uploads/shrek/shrek_PNG10.png',
    # Donkey
    'https://pngimg.com/uploads/donkey/donkey_PNG1.png',
    # Lion King
    'https://pngimg.com/uploads/lion_king/lion_king_PNG1.png',
    'https://pngimg.com/uploads/lion_king/lion_king_PNG2.png',
    'https://pngimg.com/uploads/lion_king/lion_king_PNG3.png',
    'https://pngimg.com/uploads/simba/simba_PNG1.png',
    # Toy Story
    'https://pngimg.com/uploads/toy_story/toy_story_PNG1.png',
    'https://pngimg.com/uploads/toy_story/toy_story_PNG2.png',
    'https://pngimg.com/uploads/woody/woody_PNG1.png',
    'https://pngimg.com/uploads/buzz_lightyear/buzz_lightyear_PNG1.png',
    # Kung Fu Panda
    'https://pngimg.com/uploads/kung_fu_panda/kung_fu_panda_PNG1.png',
    'https://pngimg.com/uploads/kung_fu_panda/kung_fu_panda_PNG2.png',
    'https://pngimg.com/uploads/panda/panda_PNG1.png',
]

for url in test_urls:
    try:
        req = urllib.request.Request(url, headers=headers, method='HEAD')
        resp = urllib.request.urlopen(req, timeout=5)
        print(f"EXISTS: {url} (size={resp.headers.get('Content-Length')})")
    except Exception as e:
        pass
