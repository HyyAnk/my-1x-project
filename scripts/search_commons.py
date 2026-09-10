import urllib.request
import urllib.parse
import json

HEADERS = {'User-Agent': 'QuizStudioBot/1.0 (educational curator)'}

entities = [
    ("Terminator", "Terminator OR T-800"),
    ("Sarah Connor", "Sarah Connor Linda Hamilton"),
    ("Ellen Ripley", "Sigourney Weaver Alien Ripley"),
    ("Neo Matrix", "Keanu Reeves Matrix Neo"),
    ("Morpheus Matrix", "Laurence Fishburne Morpheus"),
    ("Marty McFly", "Marty McFly Back to the Future OR DeLorean"),
    ("Doc Brown", "Christopher Lloyd Doc Brown OR Emmett Brown"),
    ("Rocky Balboa", "Rocky Balboa Sylvester Stallone"),
    ("John Rambo", "Rambo Sylvester Stallone First Blood"),
    ("James Bond", "James Bond Sean Connery OR Daniel Craig"),
    ("Indiana Jones", "Indiana Jones Harrison Ford"),
    ("Captain Jack Sparrow", "Jack Sparrow Johnny Depp Pirates of the Caribbean"),
    ("Rubik's Cube", "Rubik's cube colorful puzzle 3D"),
    ("Monopoly", "Monopoly board game Rich Uncle Pennybags"),
    ("Scrabble", "Scrabble board game tiles letters"),
    ("Uno", "Uno card game cards colorful")
]

for label, query in entities:
    url = f"https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch={urllib.parse.quote(query)}&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url|size|mime&format=json"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        data = json.loads(urllib.request.urlopen(req, timeout=10).read().decode('utf-8'))
        pages = data.get('query', {}).get('pages', {})
        print(f"=== {label} ({len(pages)} files) ===")
        for pid, p in pages.items():
            title = p.get('title')
            ii = p.get('imageinfo', [{}])[0]
            print(f"  {title}: {ii.get('width')}x{ii.get('height')} -> {ii.get('url')}")
    except Exception as e:
        print(f"=== {label} Error: {e} ===")
