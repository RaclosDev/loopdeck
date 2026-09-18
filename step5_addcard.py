import re

with open('src/pages/AddCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the whole div containing the magic generation
content = re.sub(r'<div style={{ background: \'rgba\(59, 130, 246, 0\.1\)[^>]*>.*?</div>', 
"""<p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Escribe o pega una lista de conceptos (separados por comas o saltos de línea) para autogenerar las tarjetas.
            </p>""", content, flags=re.DOTALL)

with open('src/pages/AddCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
