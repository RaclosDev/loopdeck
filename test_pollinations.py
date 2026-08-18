import urllib.request

url = "https://image.pollinations.ai/prompt/a%20simple%20clean%20photo%20of%20a%20house%20on%20white%20background?width=600&height=400&nologo=true"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        print(response.getcode())
        print(response.info().get_content_type())
except Exception as e:
    print("Error:", e)
