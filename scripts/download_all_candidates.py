import os
import requests
from PIL import Image
import io

os.makedirs('scripts/candidates', exist_ok=True)
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
session = requests.Session()
session.headers.update(headers)

urls = {
    # Shrek
    'shrek_1': 'https://pngimg.com/uploads/shrek/shrek_PNG1.png',
    'shrek_2': 'https://pngimg.com/uploads/shrek/shrek_PNG2.png',
    'shrek_4': 'https://pngimg.com/uploads/shrek/shrek_PNG4.png',
    'shrek_9': 'https://pngimg.com/uploads/shrek/shrek_PNG9.png',
    
    # Donkey
    'donkey_1': 'https://pngimg.com/uploads/donkey/donkey_PNG1.png',
    'donkey_3': 'https://pngimg.com/uploads/donkey/donkey_PNG3.png',
    'donkey_4': 'https://pngimg.com/uploads/donkey/donkey_PNG4.png',
    'donkey_5': 'https://pngimg.com/uploads/donkey/donkey_PNG5.png',
    
    # Woody
    'woody_1': 'https://www.pngmart.com/files/12/Sheriff-Woody-Toy-Story-PNG-Photos.png',
    'woody_2': 'https://www.pngmart.com/files/12/Sheriff-Woody-Toy-Story-PNG-Transparent-Image.png',
    'woody_3': 'https://www.pngmart.com/files/12/Sheriff-Woody-Toy-Story-PNG-Image.png',
    'woody_4': 'https://www.pngmart.com/files/12/Sheriff-Woody-Toy-Story-Transparent-PNG.png',
    
    # Buzz
    'buzz_1': 'https://www.pngmart.com/files/6/Buzz-Lightyear-PNG-Photos.png',
    'buzz_2': 'https://www.pngmart.com/files/6/Buzz-Lightyear-PNG-Transparent-HD-Photo.png',
    'buzz_3': 'https://www.pngmart.com/files/6/Buzz-Lightyear-Download-PNG-Image.png',
    'buzz_4': 'https://www.pngmart.com/files/6/Buzz-Lightyear-PNG-Background-Image.png',
    
    # Po
    'po_1': 'https://www.pngmart.com/files/8/Kung-Fu-Panda-PNG-HD-Quality.png',
    'po_2': 'https://www.pngmart.com/files/8/Kung-Fu-Panda-PNG-Image-HD.png',
    'po_3': 'https://www.pngmart.com/files/8/Kung-Fu-Panda-PNG-Transparent-Image.png',
    'po_4': 'https://www.pngmart.com/files/8/Kung-Fu-Panda-PNG-Transparent-Images.png'
}

for name, u in urls.items():
    dest = f"scripts/candidates/{name}.png"
    if os.path.exists(dest):
        continue
    try:
        r = session.get(u, timeout=10)
        if r.status_code == 200:
            with open(dest, 'wb') as f:
                f.write(r.content)
            img = Image.open(dest)
            print(f"Downloaded {name}: size={img.size}, mode={img.mode}, bytes={len(r.content)}")
    except Exception as e:
        print(f"Error {name}: {e}")
