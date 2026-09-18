import re

with open('src/pages/AddCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove inline background styling for form-input since form-input in design-system.css already has it
content = re.sub(
    r'style=\{\{ minHeight: \'120px\', padding: \'12px\', fontSize: \'1rem\', lineHeight: 1\.5, background: \'var\(--bg-card\)\', borderRadius: \'12px\' \}\}',
    r'style={{ minHeight: "120px" }}',
    content
)

with open('src/pages/AddCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
