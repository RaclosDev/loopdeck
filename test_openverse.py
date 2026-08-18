import urllib.request
url = "https://api.openverse.engineering/v1/images/?q=house"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Origin': 'http://localhost:5173'})
try:
    with urllib.request.urlopen(req) as response:
        print("CORS:", response.getheader('Access-Control-Allow-Origin'))
except Exception as e:
    print("Error:", e)
