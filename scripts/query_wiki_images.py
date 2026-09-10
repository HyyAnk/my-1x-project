import urllib.request, urllib.parse, json

def get_wiki_images(title):
    url = f"https://en.wikipedia.org/w/api.php?action=query&titles={urllib.parse.quote(title)}&prop=images&format=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'QuizStudio/1.0'})
    data = json.loads(urllib.request.urlopen(req).read())
    pages = data.get('query', {}).get('pages', {})
    images = []
    for pid, pdata in pages.items():
        for im in pdata.get('images', []):
            images.append(im['title'])
    return images

def get_image_url(image_title):
    url = f"https://en.wikipedia.org/w/api.php?action=query&titles={urllib.parse.quote(image_title)}&prop=imageinfo&iiprop=url|size&format=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'QuizStudio/1.0'})
    data = json.loads(urllib.request.urlopen(req).read())
    pages = data.get('query', {}).get('pages', {})
    for pid, pdata in pages.items():
        info = pdata.get('imageinfo', [{}])[0]
        return info.get('url'), info.get('width'), info.get('height')
    return None, 0, 0

for t in ["Donkey (Shrek)", "Shrek (character)", "Woody (Toy Story)", "Buzz Lightyear", "Po (Kung Fu Panda)", "Simba", "Mufasa", "Scar (The Lion King)"]:
    imgs = get_wiki_images(t)
    print(f"=== {t} ===")
    for im in imgs:
        u, w, h = get_image_url(im)
        print(f"  {im} -> {w}x{h}: {u}")
