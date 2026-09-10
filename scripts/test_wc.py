import urllib.request
import urllib.parse
import re

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
}

def search_wallpapercave(query):
    url = f"https://wallpapercave.com/search?q={urllib.parse.quote(query)}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            # Look for album links or image links
            albums = re.findall(r'href="(/w/[^"]+)"', html)
            imgs = re.findall(r'src="(https://wallpapercave\.com/wp/[^"]+)"', html)
            return albums, imgs
    except Exception as e:
        print(f"Error: {e}")
        return [], []

albums, imgs = search_wallpapercave("terminator")
print("Albums:", albums[:3])
print("Imgs:", imgs[:3])
