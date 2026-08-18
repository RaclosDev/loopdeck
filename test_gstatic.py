import urllib.request
import re

url = "https://www.google.com/search?q=jengibre&tbm=isch"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8', errors='ignore')
        # Find gstatic images
        urls = re.findall(r'https://encrypted-tbn0\.gstatic\.com/images\?q=tbn:[^"\']+', html)
        print("Found:", len(urls))
        if urls:
            print(urls[0])
except Exception as e:
    print("Error:", e)
