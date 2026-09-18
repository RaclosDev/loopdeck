import re

with open('frontend/src/pages/Browser.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# For Decks
content = re.sub(
    r'<Badge\s+key={d.id}\s+variant={selectedDeckId === d.id \? "default" : "outline"}\s+className="cursor-pointer text-\[12px\] px-3 py-1"\s+onClick={\(\) => setSelectedDeckId\(d.id\)}\s*>\s*{d.name}\s*</Badge>',
    r'''<button key={d.id} onClick={() => setSelectedDeckId(d.id)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '8px', cursor: 'pointer', border: 'none', background: selectedDeckId === d.id ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: selectedDeckId === d.id ? 'var(--accent-text, white)' : 'var(--text-secondary)', fontWeight: selectedDeckId === d.id ? 600 : 400, transition: 'all 0.2s ease', whiteSpace: 'nowrap' }}>{d.name}</button>''',
    content
)

# For Sin Mazos
content = content.replace('<Badge variant="outline">Sin mazos</Badge>', '<div style={{ padding: \'0.4rem 0.8rem\', fontSize: \'0.8rem\', borderRadius: \'8px\', background: \'var(--bg-secondary)\', color: \'var(--text-secondary)\' }}>Sin mazos</div>')

# For Tags (Todas)
content = re.sub(
    r'<Badge\s+variant={selectedTag === \'\' \? "default" : "outline"}\s+className="cursor-pointer text-\[12px\] px-3 py-1"\s+onClick={\(\) => setSelectedTag\(\'\'\)}\s*>\s*Todas\s*</Badge>',
    r'''<button onClick={() => setSelectedTag('')} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '8px', cursor: 'pointer', border: 'none', background: selectedTag === '' ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: selectedTag === '' ? 'var(--accent-text, white)' : 'var(--text-secondary)', fontWeight: selectedTag === '' ? 600 : 400, transition: 'all 0.2s ease', whiteSpace: 'nowrap' }}>Todas</button>''',
    content
)

# For Tags (individual)
content = re.sub(
    r'<Badge\s+key={t}\s+variant={selectedTag === t \? "default" : "outline"}\s+className="cursor-pointer text-\[12px\] px-3 py-1"\s+onClick={\(\) => setSelectedTag\(t\)}\s*>\s*{t}\s*</Badge>',
    r'''<button key={t} onClick={() => setSelectedTag(t)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '8px', cursor: 'pointer', border: 'none', background: selectedTag === t ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: selectedTag === t ? 'var(--accent-text, white)' : 'var(--text-secondary)', fontWeight: selectedTag === t ? 600 : 400, transition: 'all 0.2s ease', whiteSpace: 'nowrap' }}>{t}</button>''',
    content
)

with open('frontend/src/pages/Browser.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
