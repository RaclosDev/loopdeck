import urllib.request
import json

url = "https://api.openverse.engineering/v1/images/?q=ginger"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print(len(data['results']))
except Exception as e:
    print("Error:", e)
