import requests, re
from PIL import Image
import io

headers = {'User-Agent': 'Mozilla/5.0'}
url = 'https://www.freeiconspng.com/uploads/comic-donkey-character-of-shrek-movie-13.png'
r = requests.get(url, headers=headers, timeout=10)
if r.status_code == 200:
    with open('scripts/candidates/donkey_shrek_freeicon.png', 'wb') as f:
        f.write(r.content)
    im = Image.open('scripts/candidates/donkey_shrek_freeicon.png')
    print("Downloaded donkey_shrek_freeicon:", im.size, im.mode, len(r.content))

# Also search https://www.freeiconspng.com/images/donkey-png
r2 = requests.get('https://www.freeiconspng.com/images/donkey-png', headers=headers, timeout=10)
imgs = list(dict.fromkeys(re.findall(r'https://www\.freeiconspng\.com/uploads/[^"\'<>\s]+\.png', r2.text)))
print("Found other donkey pngs:", len(imgs))
for im_u in imgs:
    print(" ", im_u)
