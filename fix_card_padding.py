import os
import re

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Remove style={{ padding: 'Xrem' }} or padding: 0 from className="card"
            content = re.sub(r'(className="card"[^>]*)style=\{\{\s*padding:\s*[\'"][^\'"]+[\'"]\s*,?', r'\1style={{', content)
            content = re.sub(r'(className="card"[^>]*)style=\{\{\s*padding:\s*\d+\s*,?', r'\1style={{', content)
            
            # Clean up empty style={{}} that might result from above
            content = re.sub(r'style=\{\{\s*\}\}', '', content)
            content = re.sub(r'style=\{\{\s*,\s*', 'style={{ ', content)
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
