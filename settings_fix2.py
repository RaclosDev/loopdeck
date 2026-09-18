import os
import re

with open('src/pages/Settings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'if\s*\(window\.confirm\([^\)]+\)\)\s*\{([^}]+)\}', r'\1', content)

with open('src/pages/Settings.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
