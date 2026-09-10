import requests, os
from PIL import Image

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
session = requests.Session()
session.headers.update(headers)

ids = ['4085083', '4084983', '4084988', '4085000', '4085031', '4085038', '4085040', '4085053', '4085058', '4085014']
os.makedirs('scripts/candidates/wp_donkey', exist_ok=True)

for i in ids:
    url = f"https://wallpaperaccess.com/full/{i}.jpg"
    dest = f"scripts/candidates/wp_donkey/{i}.jpg"
    try:
        r = session.get(url, timeout=10)
        if r.status_code == 200:
            with open(dest, 'wb') as f:
                f.write(r.content)
            im = Image.open(dest)
            print(f"Downloaded {i}: {im.size} {len(r.content)//1024}KB")
    except Exception as e:
        print(f"Error {i}: {e}")
