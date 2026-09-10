import urllib.request
import urllib.parse
import json

headers = {'User-Agent': 'QuizStudioCurator/1.0 (educational quiz platform; contact: test@quizstudio.local)'}

titles = [
    'Terminator (character)', 'Sarah Connor (Terminator)', 'Ellen Ripley',
    'Neo (The Matrix)', 'Morpheus (The Matrix)', 'Marty McFly',
    'Emmett Brown', 'Rocky Balboa', 'John Rambo',
    'James Bond in film', 'Indiana Jones (character)', 'Jack Sparrow',
    'Rubik\'s Cube', 'Monopoly (game)', 'Scrabble', 'Uno (card game)'
]

for title in titles:
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title)}"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            orig = data.get('originalimage', {})
            thumb = data.get('thumbnail', {})
            print(f"{title} -> orig: {orig.get('source')} ({orig.get('width')}x{orig.get('height')})")
    except Exception as e:
        print(f"{title} -> Error: {e}")
