import sys

def replace_in_file(filepath, old_text, new_text):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    if old_text in content:
        content = content.replace(old_text, new_text)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Successfully replaced in {filepath}")
    else:
        print(f"Could not find old text in {filepath}")

global_old = '''<div className="kpi-grid" style={{ marginBottom: 28 }}>
          <div className="kpi-card accent" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="kpi-value accent">{totalNew}</div>
            <div className="kpi-label" style={{ marginTop: 4 }}>NUEVAS</div>
          </div>
          <div className="kpi-card info" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="kpi-value info" style={{ color: 'var(--srs-learning)' }}>{totalLearning}</div>
            <div className="kpi-label" style={{ marginTop: 4 }}>APRENDIENDO</div>
          </div>
          <div className="kpi-card info" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="kpi-value info" style={{ color: 'var(--srs-review)' }}>{totalReview}</div>
            <div className="kpi-label" style={{ marginTop: 4 }}>REVISIÓN</div>
          </div>
          <div className="kpi-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="kpi-value">{totalNew + totalLearning + totalReview}</div>
            <div className="kpi-label" style={{ marginTop: 4 }}>TOTAL</div>
          </div>
        </div>'''

global_new = '''<div className="bg-card border border-white/5 rounded-[20px] p-4 flex justify-between items-center shadow-lg shadow-black/20 mb-8 mx-auto w-full">
          <div className="flex flex-col items-center flex-1">
            <div className="text-blue-500 font-bold text-2xl leading-none mb-1.5">{totalNew}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Nuevas</div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="flex flex-col items-center flex-1">
            <div className="text-orange-500 font-bold text-2xl leading-none mb-1.5">{totalLearning}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Aprend.</div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="flex flex-col items-center flex-1">
            <div className="text-emerald-500 font-bold text-2xl leading-none mb-1.5">{totalReview}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Revisión</div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="flex flex-col items-center flex-1">
            <div className="text-foreground font-bold text-2xl leading-none mb-1.5">{totalNew + totalLearning + totalReview}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total</div>
          </div>
        </div>'''

deck_old = '''<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '8px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '1.25rem' }}>{counts.new}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>NUEVAS</div>
                  </div>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '8px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '1.25rem' }}>{counts.learning}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>APRENDIENDO</div>
                  </div>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '8px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '1.25rem' }}>{counts.review}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>REVISIÓN</div>
                  </div>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '8px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '1.25rem' }}>{totalDue}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>TOTAL</div>
                  </div>
                </div>'''

deck_new = '''<div className="flex items-center justify-between bg-black/20 border border-white/5 rounded-xl px-2 sm:px-4 py-3 mt-2">
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
                    <span className="text-[9px] text-muted-foreground mt-1.5 uppercase font-bold tracking-wider">Revisión</span>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-foreground font-bold text-lg leading-none">{totalDue}</span>
                    <span className="text-[9px] text-muted-foreground mt-1.5 uppercase font-bold tracking-wider">Total</span>
                  </div>
                </div>'''

replace_in_file('src/pages/Dashboard.tsx', global_old, global_new)
replace_in_file('src/pages/Dashboard.tsx', deck_old, deck_new)

deck_old_global = deck_old.replace('{totalDue}', '{counts.total}')
deck_new_global = deck_new.replace('{totalDue}', '{counts.total}')
replace_in_file('src/pages/GlobalStudy.tsx', deck_old_global, deck_new_global)

