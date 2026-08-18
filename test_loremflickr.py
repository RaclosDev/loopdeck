import urllib.request
url = "https://loremflickr.com/600/400/ginger,spice"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        print("Status:", response.getcode())
        print("URL:", response.geturl())
except Exception as e:
    print("Error:", e)
