import re

with open('src/pages/AddCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('className={\x0cilter-chip }', "className={`filter-chip ${selectedType === t.id ? 'active' : ''}`}")

with open('src/pages/AddCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
