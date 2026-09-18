import os
import re

def fix_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_file('src/components/RatingButtons.tsx', [
    ('bg-white/5', 'bg-[rgba(255,255,255,0.05)]')
])
fix_file('src/pages/Study.tsx', [
    ('bg-white/5', 'bg-[rgba(255,255,255,0.05)]')
])

# Remove .primary-btn
with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()
css = re.sub(r'\.primary-btn\s*\{[^}]+\}', '', css)
with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(css)

