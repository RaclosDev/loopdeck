import re

with open('src/pages/Browser.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('filter-chip', 'pill')
content = content.replace('filter-chips-row', 'pill-row')

with open('src/pages/Browser.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
