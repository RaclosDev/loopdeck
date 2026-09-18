import re

with open('src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace padding in kpi-card
content = content.replace("""<div className="kpi-card" style={{ padding: '1.25rem' }}>""", """<div className="kpi-card" style={{ padding: '0.75rem 0.5rem' }}>""")

# Replace the Edit/Delete icons with a More button that opens a bottom sheet
old_icons = """                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <h2 className="card-title" style={{ margin: 0, fontSize: '1.25rem' }}>{deck.name}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setModalInputValue(deck.name); setEditModalDeck(deck); }}>✏️</button>
                      <button className="icon-btn" style={{ color: 'var(--color-danger)' }} onClick={(e) => { e.stopPropagation(); setDeleteModalDeck(deck); }}>🗑️</button>
                    </div>
                  </div>"""

new_icons = """                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <h2 className="card-title" style={{ margin: 0, fontSize: '1.25rem' }}>{deck.name}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="icon-btn" style={{ opacity: 0.7 }} onClick={(e) => { e.stopPropagation(); setActiveMoreMenu(deck.id); }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                      </button>
                    </div>
                  </div>
                  
                  {activeMoreMenu === deck.id && (
                    <div className="bottom-sheet-overlay" onClick={(e) => { e.stopPropagation(); setActiveMoreMenu(null); }}>
                      <div className="bottom-sheet-content" onClick={e => e.stopPropagation()}>
                        <div className="bottom-sheet-drag-handle" />
                        <h3 className="bottom-sheet-title">Opciones de Mazo</h3>
                        <button className="bottom-sheet-item" onClick={(e) => { e.stopPropagation(); setActiveMoreMenu(null); setModalInputValue(deck.name); setEditModalDeck(deck); }}>
                          <span>Editar nombre</span>
                        </button>
                        <button className="bottom-sheet-item" style={{ color: 'var(--color-danger)' }} onClick={(e) => { e.stopPropagation(); setActiveMoreMenu(null); setDeleteModalDeck(deck); }}>
                          <span>Eliminar mazo</span>
                        </button>
                      </div>
                    </div>
                  )}"""

content = content.replace(old_icons, new_icons)

# Inject the activeMoreMenu state if not present
if "const [activeMoreMenu, setActiveMoreMenu] = useState" not in content:
    content = content.replace("const [editModalDeck, setEditModalDeck] = useState", "const [activeMoreMenu, setActiveMoreMenu] = useState<string | null>(null);\n  const [editModalDeck, setEditModalDeck] = useState")

with open('src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
