import re

with open('src/pages/GlobalStudy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_kpi = '''<div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.75rem', marginTop: '0.5rem' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '1.1rem' }}>{counts.new}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, marginTop: '0.25rem', textTransform: 'uppercase' }}>Nuevas</span>
                  </div>
                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 0.5rem' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: '1.1rem' }}>{counts.learning}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, marginTop: '0.25rem', textTransform: 'uppercase' }}>Aprend.</span>
                  </div>
                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 0.5rem' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ color: '#10B981', fontWeight: 700, fontSize: '1.1rem' }}>{counts.review}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, marginTop: '0.25rem', textTransform: 'uppercase' }}>Revisión</span>
                  </div>
                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 0.5rem' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.1rem' }}>{counts.total}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, marginTop: '0.25rem', textTransform: 'uppercase' }}>Total</span>
                  </div>
                </div>'''

pattern = re.compile(r'<div className="flex items-center justify-between bg-black/20.*?(?=</div>\s*</div>\s*<div style=\{\{ background: \'var\(--bg-glass\)\')', re.DOTALL)
content = pattern.sub(new_kpi, content)

content = content.replace('z"', '➡️')
content = content.replace('Y"', '📚')
content = content.replace('aǧn', 'aún')

with open('src/pages/GlobalStudy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("GlobalStudy rewritten")
