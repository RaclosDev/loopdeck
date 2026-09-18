import re

with open('src/pages/AddCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('className="btn btn-secondary btn-sm"', 'className="pill"')
content = content.replace('FRENTE (PREGUNTA)', 'Frente')
content = content.replace('DORSO (RESPUESTA)', 'Dorso')

with open('src/pages/AddCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
