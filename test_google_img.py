import urllib.request

url = "https://www.google.com/search?q=jengibre&tbm=isch"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8', errors='ignore')
        with open("google.html", "w", encoding="utf-8") as f:
            f.write(html)
except Exception as e:
    print("Error:", e)
