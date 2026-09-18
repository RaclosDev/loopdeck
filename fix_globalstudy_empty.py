import re

with open('src/pages/GlobalStudy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Refactor the empty state
old_empty = r'<div className="card" style=\{\{ textAlign: \'center\', borderStyle: \'dashed\' \}\}>\s*<div style=\{\{ fontSize: \'3rem\', marginBottom: \'1rem\', opacity: 0\.5 \}\}>📚</div>\s*<h3 className="card-title" style=\{\{ margin: \'0 0 0\.5rem 0\' \}\}>¡No tienes mazos aún!</h3>\s*<p style=\{\{ color: \'var\(--text-muted\)\', margin: \'0 0 1\.5rem 0\' \}\}>Ve a Mis Mazos para crear tu primer mazo de tarjetas\.</p>\s*<button className="btn btn-primary" onClick=\{\(\) => navigate\(\'/\'\)\}>Ir a Mis Mazos</button>\s*</div>'

new_empty = """<div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <h3 className="empty-state-title">¡No tienes mazos aún!</h3>
            <p className="empty-state-desc">Ve a Mis Mazos para crear tu primer mazo de tarjetas.</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>Ir a Mis Mazos</button>
          </div>"""

content = re.sub(old_empty, new_empty, content, flags=re.DOTALL)

with open('src/pages/GlobalStudy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
