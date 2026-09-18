with open('public/manifest.json', 'r', encoding='utf-8-sig') as f:
    content = f.read()

content = content.replace('"start_url": "/"', '"start_url": "/?v=2"')
content = content.replace('"theme_color": "#000000"', '"theme_color": "#0a0e1a"')
content = content.replace('"background_color": "#000000"', '"background_color": "#0a0e1a"')

with open('public/manifest.json', 'w', encoding='utf-8') as f:
    f.write(content)
