import urllib.request
import json

url = "https://api.mymemory.translated.net/get?q=casa&langpair=es|en"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except Exception as e:
    print("Error:", e)
