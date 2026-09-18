import re

with open('frontend/src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We want to replace the `decks.map` card logic.
pattern = r'return \(\s*<div key=\{deck\.id\} className="card overflow-hidden p-0 flex flex-col">.*?<div className="bg-\[var\(--bg-glass\)\] p-4 flex gap-3">.*?</div>\s*</div>\s*\);\s*}\)}'

# We'll use re.DOTALL to capture everything from return ( <div ... to end of map.
# Wait, it's safer to just split by the parts we know.

start_marker = 'return (\n            <div key={deck.id} className="card overflow-hidden p-0 flex flex-col">'
end_marker = '          );\n        })}\n\n        <div className="card border-2 border-dashed'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

new_block = '''return (
            <div key={deck.id} className="card" style={{ overflow: 'hidden', padding: 0, marginBottom: '1rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex justify-between items-start" style={{ marginBottom: '1rem' }}>
                  <h3 className="card-title" style={{ margin: '0', fontSize: '1.25rem', cursor: 'pointer' }} onClick={() => navigate(`/study/${deck.id}`)}>{deck.name}</h3>
                  <Button variant="ghost" size="icon" onClick={() => setActiveMoreMenu(deck.id)} style={{ marginTop: '-4px', marginRight: '-8px' }}>
                    <MoreVertical className="w-5 h-5 opacity-70" />
                  </Button>
                </div>
                
                <BottomSheet
                  isOpen={activeMoreMenu === deck.id}
                  onClose={() => setActiveMoreMenu(null)}
                  title="Opciones de Mazo"
                >
                  <div className="bottom-sheet-grid">
                    <button className="bottom-sheet-item" onClick={(e) => { e.stopPropagation(); setActiveMoreMenu(null); setModalInputValue(deck.name); setEditModalDeck(deck); }}>
                      <Edit3 className="bottom-sheet-item-icon" />
                      <span>Editar nombre</span>
                    </button>
                    <button className="bottom-sheet-item text-destructive" onClick={(e) => { e.stopPropagation(); setActiveMoreMenu(null); setDeleteModalDeck(deck); }}>
                      <Trash2 className="bottom-sheet-item-icon bg-destructive/10 text-destructive" />
                      <span>Eliminar mazo</span>
                    </button>
                  </div>
                </BottomSheet>

                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.75rem', marginTop: '0.5rem' }}>
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
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.1rem' }}>{totalCards}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, marginTop: '0.25rem', textTransform: 'uppercase' }}>Total</span>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-glass)', padding: '1rem', display: 'flex', gap: '0.75rem' }}>
                {totalDue > 0 ? (
                  <Button style={{ flex: 1, borderRadius: '12px', padding: '0.875rem', fontWeight: 700 }} className="btn-primary" onClick={() => navigate(`/study/${deck.id}`)}>
                    <Play className="w-5 h-5 mr-2" fill="currentColor" /> Responder ({totalDue})
                  </Button>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                    Al día 🌟
                  </div>
                )}
                <Button style={{ width: '48px', height: 'auto', borderRadius: '12px' }} onClick={() => navigate(`/add/${deck.id}`)}>
                  <Plus className="w-5 h-5" />
                </Button>
                <Button variant="secondary" style={{ width: '48px', height: 'auto', borderRadius: '12px' }} onClick={() => navigate(`/browser?deck=${deck.id}`)}>
                  <Search className="w-5 h-5" />
                </Button>
              </div>
            </div>
'''

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_block + content[end_idx:]
    with open('frontend/src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Could not find markers")
