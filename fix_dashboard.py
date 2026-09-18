import re
with open('frontend/src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_block = '''<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        {decks.map(deck => {
          const counts = deckCounts[deck.id] || { new: 0, learning: 0, review: 0, totalCount: 0 };
          const totalDue = counts.new + counts.learning + counts.review;
          const totalCards = counts.totalCount || 0;
          
          return (
            <div key={deck.id} className="card" style={{ cursor: 'pointer', border: '2px solid var(--border-medium)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '12px', padding: '1.5rem' }}
                 onClick={() => navigate(`/study/${deck.id}`)}
                 onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                 onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-medium)'}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h2 style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '1.2rem' }}>
                   {deck.name}
                  {totalDue > 0 && <span style={{ background: 'var(--accent-primary)', color: 'var(--accent-text, white)', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '12px' }}>{totalDue} DUE</span>}
                </h2>
                
                <div style={{ display: 'flex', gap: '0.2rem' }}>
                  <Button variant="ghost" size="icon" style={{ width: '32px', height: '32px', margin: '-4px' }} onClick={(e) => { e.stopPropagation(); navigate(`/add/${deck.id}`); }}>
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" style={{ width: '32px', height: '32px', margin: '-4px' }} onClick={(e) => { e.stopPropagation(); navigate(`/browser?deck=${deck.id}`); }}>
                    <Search className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" style={{ width: '32px', height: '32px', margin: '-4px' }} onClick={(e) => { e.stopPropagation(); setActiveMoreMenu(deck.id); }}>
                    <MoreVertical className="w-4 h-4 opacity-70" />
                  </Button>
                </div>
              </div>

              <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: 1.4, maxWidth: '90%' }}>
                {counts.new} Nuevas • {counts.learning} Aprendiendo • {counts.review} Repaso<br/>
                Total: {totalCards} tarjetas
              </p>
              
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
            </div>
          );
        })}'''

start_idx = content.find('<div className="flex flex-col gap-6">')
end_idx = content.find('<div className="card border-2 border-dashed')

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_block + '\n\n        ' + content[end_idx:]
    with open('frontend/src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
else:
    print('Could not find boundaries')
