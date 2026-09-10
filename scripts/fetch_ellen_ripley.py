import os
import re
import urllib.request
from PIL import Image
import io

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
}

def get_album_images(album_path, max_images=10):
    url = f"https://wallpapercave.com{album_path}" if album_path.startswith('/') else album_path
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            matches = list(dict.fromkeys(re.findall(r'(wp[0-9]+\.(?:jpg|png))', html)))
            return [f"https://wallpapercave.com/wp/{m}" for m in matches[:max_images]]
    except Exception as e:
        print(f"Error fetching album {album_path}: {e}")
        return []

def download_and_crop(url, out_path, target_w=1280, target_h=720):
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
            im = Image.open(io.BytesIO(data)).convert("RGB")
            src_w, src_h = im.size
            target_ratio = target_w / target_h
            src_ratio = src_w / src_h
            
            if src_ratio > target_ratio:
                new_w = int(src_h * target_ratio)
                left = (src_w - new_w) // 2
                im_cropped = im.crop((left, 0, left + new_w, src_h))
            else:
                new_h = int(src_w / target_ratio)
                top = max(0, int((src_h - new_h) * 0.20))
                im_cropped = im.crop((0, top, src_w, top + new_h))
                
            im_resized = im_cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            im_resized.save(out_path, format="PNG", optimize=True)
            return True, im.size
    except Exception as e:
        print(f"Failed to process {url}: {e}")
        return False, (0, 0)

if __name__ == '__main__':
    # Try multiple alien albums
    imgs = get_album_images("/aliens-wallpapers", 15)
    imgs += get_album_images("/alien-movie-wallpapers", 10)
    print(f"Found {len(imgs)} candidate images for Ellen Ripley")
    idx = 1
    for u in imgs:
        out = f"tmp/inspect_candidates/ellen_ripley_{idx}.png"
        ok, orig_size = download_and_crop(u, out)
        if ok:
            print(f"Saved candidate {idx}: {out} (from {u}, orig: {orig_size})")
            idx += 1
            if idx > 8:
                break
