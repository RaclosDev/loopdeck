import urllib.request
import json
import re

# To search duckduckgo images, first we need a vqd token
url = "https://duckduckgo.com/?q=jengibre&t=h_&iar=images&iax=images&ia=images"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        vqd_match = re.search(r'vqd=([\d-]+)', html)
        if vqd_match:
            vqd = vqd_match.group(1)
            print("VQD:", vqd)
            
            # Now fetch images
            img_url = f"https://duckduckgo.com/i.js?l=us-en&o=json&q=jengibre&vqd={vqd}"
            req2 = urllib.request.Request(img_url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req2) as res2:
                data = json.loads(res2.read().decode('utf-8'))
                if 'results' in data and len(data['results']) > 0:
                    print(data['results'][0]['image'])
        else:
            print("No vqd found")
except Exception as e:
    print("Error:", e)
