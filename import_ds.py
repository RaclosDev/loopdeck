with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Prepend the import
if "@import './design-system.css';" not in content:
    content = "@import './design-system.css';\n" + content

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(content)
