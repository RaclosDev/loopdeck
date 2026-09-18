import re

with open('src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the Edit/Delete icons section
old_pattern = r'<div style=\{\{ display: \'flex\', justifyContent: \'space-between\', alignItems: \'flex-start\', marginBottom: 12 \}\}>\s*<h2 className="card-title" style=\{\{ margin: 0, fontSize: \'1\.25rem\' \}\}>\{deck\.name\}</h2>\s*<div style=\{\{ display: \'flex\', gap: \'0\.5rem\' \}\}>.*?</div>\s*</div>'

new_icons = """<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
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

content = re.sub(old_pattern, new_icons, content, flags=re.DOTALL)

with open('src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
