import re

with open('frontend/src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = 'return (\n            <div key={deck.id} className="card overflow-hidden p-0 flex flex-col">'
end_marker = '          );\n        })}\n\n        <div className="card border-2 border-dashed'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find blocks in HEAD")
else:
    new_block = '''return (
            <div key={deck.id} className="overflow-hidden flex flex-col cursor-pointer transition-colors" style={{ background: '#1c1c1c', border: '1px solid #333', borderRadius: '12px' }} onClick={() => navigate(`/hub/${deck.id}`)}>
              <div className="p-5 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <h2 className="text-[1.2rem] font-bold m-0 text-white">{deck.name}</h2>
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

                <div className="flex rounded-md p-4" style={{ background: '#161616', border: '1px solid #222' }}>
                  <div className="flex-1 flex flex-col items-center">
                    <span className="font-bold text-lg" style={{ color: '#007AFF' }}>{counts.new}</span>
                    <span className="text-[#666] text-[0.65rem] font-bold mt-1 uppercase tracking-wider">Nuevas</span>
                  </div>
                  <div className="w-[1px] bg-[#222] mx-2" />
                  <div className="flex-1 flex flex-col items-center">
                    <span className="font-bold text-lg" style={{ color: '#F59E0B' }}>{counts.learning}</span>
                    <span className="text-[#666] text-[0.65rem] font-bold mt-1 uppercase tracking-wider">Aprend.</span>
                  </div>
                  <div className="w-[1px] bg-[#222] mx-2" />
                  <div className="flex-1 flex flex-col items-center">
                    <span className="font-bold text-lg" style={{ color: '#10B981' }}>{counts.review}</span>
                    <span className="text-[#666] text-[0.65rem] font-bold mt-1 uppercase tracking-wider">Revisión</span>
                  </div>
                  <div className="w-[1px] bg-[#222] mx-2" />
                  <div className="flex-1 flex flex-col items-center">
                    <span className="font-bold text-lg text-white">{totalCards}</span>
                    <span className="text-[#666] text-[0.65rem] font-bold mt-1 uppercase tracking-wider">Total</span>
                  </div>
                </div>
              </div>
              <div className="px-5 pb-5 flex">
                <Button className="flex-1 py-6 text-[0.95rem] font-bold rounded-lg text-white transition-opacity hover:opacity-90" style={{ background: '#007AFF', border: 'none' }} onClick={(e) => { e.stopPropagation(); navigate(`/hub/${deck.id}`); }}>
                  Entrar al Hub
                </Button>
              </div>
            </div>
'''
    content = content[:start_idx] + new_block + content[end_idx:]
    
    with open('frontend/src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
