import urllib.request
import re
from PIL import Image
import io

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'}
req = urllib.request.Request('https://wallpapercave.com/terminator-wallpapers', headers=headers)
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        imgs = re.findall(r'(https://wallpapercave\.com/wp/[^"\']+\.(?:jpg|png))', html)
        print(f"Found images: {len(imgs)}")
        for img in list(set(imgs))[:5]:
            print(" ", img)
            # check dimension
            try:
                img_req = urllib.request.Request(img, headers=headers)
                with urllib.request.urlopen(img_req, timeout=5) as img_resp:
                    data = img_resp.read()
                    im = Image.open(io.BytesIO(data))
                    print(f"   Resolution: {im.size}, Format: {im.format}, Bytes: {len(data)}")
            except Exception as ex:
                print(f"   Failed to load image: {ex}")
except Exception as e:
    print(f"Error: {e}")
