import urllib.request
import json

url = "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=jengibre&gsrlimit=10&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        pages = data.get('query', {}).get('pages', {})
        for k, v in pages.items():
            if 'imageinfo' in v:
                print(v['title'])
                print(v['imageinfo'][0]['thumburl'])
except Exception as e:
    print("Error:", e)
