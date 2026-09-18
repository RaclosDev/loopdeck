import re

with open('src/pages/GlobalStudy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_stats = """                  <div className="flex items-center justify-between bg-black/20 border border-white/5 rounded-xl px-2 sm:px-4 py-3 mt-2">
                    <div className="flex flex-col items-center flex-1">
                      <span className="text-blue-500 font-bold text-lg leading-none">{counts.new}</span>
                      <span className="text-[10px] text-muted-foreground mt-1.5 uppercase font-bold tracking-wider">Nuevas</span>
                    </div>
                    <div className="w-px h-6 bg-white/10" />
                    <div className="flex flex-col items-center flex-1">
                      <span className="text-orange-500 font-bold text-lg leading-none">{counts.learning}</span>
                      <span className="text-[10px] text-muted-foreground mt-1.5 uppercase font-bold tracking-wider">Aprend.</span>
                    </div>
                    <div className="w-px h-6 bg-white/10" />
                    <div className="flex flex-col items-center flex-1">
                      <span className="text-emerald-500 font-bold text-lg leading-none">{counts.review}</span>
                      <span className="text-[10px] text-muted-foreground mt-1.5 uppercase font-bold tracking-wider">Revisión</span>
                    </div>
                    <div className="w-px h-6 bg-white/10" />
                    <div className="flex flex-col items-center flex-1">
                      <span className="text-foreground font-bold text-lg leading-none">{counts.total}</span>
                      <span className="text-[10px] text-muted-foreground mt-1.5 uppercase font-bold tracking-wider">Total</span>
                    </div>
                  </div>"""

new_stats = """                  <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.75rem', marginTop: '0.5rem' }}>
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
                  </div>"""

content = content.replace(old_stats, new_stats)

# Also fix the button inside the card: it currently says `-> Entrar al Hub`, make it identical
old_btn = """                <div style={{ padding: '1rem', background: 'var(--bg-glass)' }}>
                  <button className="btn btn-primary" style={{ width: '100%' }}>
                    → Entrar al Hub
                  </button>
                </div>"""

new_btn = """                <div style={{ padding: '1rem', background: 'var(--bg-glass)' }}>
                  <button className="btn btn-primary" style={{ width: '100%' }}>
                    → Entrar al Hub
                  </button>
                </div>"""
# Wait, let's keep the button text as "Entrar al Hub" but ensure the card container is nicely formatted.
# I'll just save content.

with open('src/pages/GlobalStudy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

