import re

with open('src/pages/GlobalStudy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the inner KPI block
old_kpi = '''<div className="flex items-center justify-between bg-black/20 border border-white/5 rounded-xl px-2 sm:px-4 py-3 mt-2">
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-blue-500 font-bold text-lg leading-none">{counts.new}</span>
                    <span className="text-[9px] text-muted-foreground mt-1.5 uppercase font-bold tracking-wider">Nuevas</span>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-orange-500 font-bold text-lg leading-none">{counts.learning}</span>
                    <span className="text-[9px] text-muted-foreground mt-1.5 uppercase font-bold tracking-wider">Aprend.</span>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-emerald-500 font-bold text-lg leading-none">{counts.review}</span>
                    <span className="text-[9px] text-muted-foreground mt-1.5 uppercase font-bold tracking-wider">Revisin</span>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-foreground font-bold text-lg leading-none">{counts.total}</span>
                    <span className="text-[9px] text-muted-foreground mt-1.5 uppercase font-bold tracking-wider">Total</span>
                  </div>
                </div>'''

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

# wait, I can just replace by using a regex for <div className="flex items-center justify-between bg-black/20 all the way to the last </div> inside it.
import re
pattern = re.compile(r'<div className="flex items-center justify-between bg-black/20.*?(?=</div>\s*</div>\s*<div style=\{\{ background: \'var\(--bg-glass\)\')', re.DOTALL)
content = pattern.sub(new_kpi, content)

content = content.replace('z"', '➡️')
content = content.replace('Y"', '📚')
content = content.replace('aǧn', 'aún')

with open('src/pages/GlobalStudy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
