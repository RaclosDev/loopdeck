import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("@import './design-system.css';\n", "")
content = content.replace("@import \"tailwindcss\";\n@import \"tailwindcss/theme\" theme(reference);\n", "@import \"tailwindcss\";\n@import \"tailwindcss/theme\" theme(reference);\n@import \"./design-system.css\";\n")

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(content)
