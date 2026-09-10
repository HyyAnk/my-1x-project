import requests
from PIL import Image
import io

session = requests.Session()
session.headers.update({'User-Agent': 'Mozilla/5.0'})

for i in range(1, 16):
    url = f"https://pngimg.com/uploads/shrek/shrek_PNG{i}.png"
    try:
        r = session.get(url, timeout=5)
        if r.status_code == 200:
            with open(f"scripts/candidates/shrek_all_{i}.png", 'wb') as f:
                f.write(r.content)
            im = Image.open(f"scripts/candidates/shrek_all_{i}.png")
            print(f"shrek_all_{i}: {im.size}")
    except Exception as e:
        print(f"shrek {i}: {e}")
