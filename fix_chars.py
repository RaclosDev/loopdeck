import re

with open('src/pages/AddCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('Aadir', 'Añadir')
content = content.replace('Galera', 'Galería')
content = content.replace('mltiples', 'múltiples')
content = content.replace('Encapsulacin', 'Encapsulación')

with open('src/pages/AddCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
