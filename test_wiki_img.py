import urllib.request
import json

url = "https://es.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=casa&gsrlimit=1&prop=pageimages&pithumbsize=500&format=json"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except Exception as e:
    print("Error:", e)
