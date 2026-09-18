import re

with open('src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace inline modal overlay with ds-overlay and modal contents
content = re.sub(
    r'<div style=\{\{ position: \'fixed\', inset: 0, background: \'rgba\(0,0,0,0\.6\)\', display: \'flex\', alignItems: \'center\', justifyContent: \'center\', zIndex: 100, padding: \'1\.25rem\' \}\}>',
    r'<div className="ds-overlay">',
    content
)

content = re.sub(
    r'<div className="card" style=\{\{ width: \'100%\', maxWidth: \'340px\', padding: \'1\.5rem\', borderRadius: \'16px\' \}\}>',
    r'<div className="ds-modal-content" style={{ width: "100%", maxWidth: "340px", padding: "1.5rem", borderRadius: "var(--radius-xl)" }}>',
    content
)

with open('src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
