import re

with open('frontend/src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = 'return (\n            <div key={deck.id} className="card overflow-hidden p-0 flex flex-col">'
end_marker = '          );\n        })}\n\n        <div className="card border-2 border-dashed'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find blocks")
else:
    new_block = '''return (
            <div key={deck.id} className="card overflow-hidden p-0 flex flex-col hover:border-[var(--accent-primary)] transition-colors cursor-pointer" onClick={() => navigate(`/hub/${deck.id}`)}>
              <div className="p-4 border-b border-[var(--border-subtle)]">
                <h2 className="text-[1.1rem] font-bold m-0 mb-3 text-white">{deck.name}</h2>
                <div className="flex bg-black/20 border border-white/5 rounded-xl p-3">
                  <div className="flex-1 flex flex-col items-center">
                    <span className="text-[var(--accent-primary)] font-bold text-lg">{counts.new}</span>
                    <span className="text-muted-foreground text-[0.65rem] font-semibold mt-1 uppercase">Nuevas</span>
                  </div>
                  <div className="w-[1px] bg-white/10 mx-2" />
                  <div className="flex-1 flex flex-col items-center">
                    <span className="text-[#F59E0B] font-bold text-lg">{counts.learning}</span>
                    <span className="text-muted-foreground text-[0.65rem] font-semibold mt-1 uppercase">Aprend.</span>
                  </div>
                  <div className="w-[1px] bg-white/10 mx-2" />
                  <div className="flex-1 flex flex-col items-center">
                    <span className="text-[#10B981] font-bold text-lg">{counts.review}</span>
                    <span className="text-muted-foreground text-[0.65rem] font-semibold mt-1 uppercase">Revisión</span>
                  </div>
                  <div className="w-[1px] bg-white/10 mx-2" />
                  <div className="flex-1 flex flex-col items-center">
                    <span className="text-foreground font-bold text-lg">{totalCards}</span>
                    <span className="text-muted-foreground text-[0.65rem] font-semibold mt-1 uppercase">Total</span>
                  </div>
                </div>
              </div>
              <div className="bg-[var(--bg-glass)] p-3 flex">
                <Button className="flex-1 py-5 text-sm font-bold rounded-lg bg-[var(--accent-primary)] hover:brightness-110 text-white" onClick={(e) => { e.stopPropagation(); navigate(`/hub/${deck.id}`); }}>
                  Entrar al Hub
                </Button>
              </div>
            </div>
'''
    
    content = content[:start_idx] + new_block + content[end_idx:]
    
    with open('frontend/src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
