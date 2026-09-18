import re

with open('src/pages/Study.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Session completed
content = re.sub(
    r'<div className="fade-in flex flex-col items-center justify-center min-h-\[80vh\] text-center px-4">.*?<h2 className="text-2xl font-bold mb-2">¡Sesión Completada!</h2>',
    r'<div className="empty-state" style={{ minHeight: "80vh", border: "none", background: "transparent" }}>\n        <div className="empty-state-icon">🎉</div>\n        <h2 className="empty-state-title">¡Sesión Completada!</h2>',
    content, flags=re.DOTALL
)

# Al día
content = re.sub(
    r'<div className="fade-in flex flex-col items-center justify-center min-h-\[80vh\] text-center px-4">\s*<div className="text-6xl mb-6">🎯</div>\s*<h2 className="text-2xl font-bold mb-2">¡Al día!</h2>',
    r'<div className="empty-state" style={{ minHeight: "80vh", border: "none", background: "transparent" }}>\n        <div className="empty-state-icon">🎯</div>\n        <h2 className="empty-state-title">¡Al día!</h2>',
    content, flags=re.DOTALL
)

with open('src/pages/Study.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
