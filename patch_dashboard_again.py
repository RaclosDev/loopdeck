import re

with open('frontend/src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I will replace the return block for the deck card to match the user's image.
# The user wants:
# 1. No 3-dot menu.
# 2. H2 title on top left.
# 3. The 4 columns of stats in a black box.
# 4. A single "Entrar al Hub" button spanning the full width at the bottom.

deck_card_pattern = r'<div key={deck\.id} className="card overflow-hidden p-0 flex flex-col">.*?</BottomSheet>'
new_top = '''<div key={deck.id} className="card overflow-hidden p-0 flex flex-col hover:border-[var(--accent-primary)] transition-colors cursor-pointer" onClick={() => navigate(`/hub/${deck.id}`)}>
              <div className="p-4 border-b border-[var(--border-subtle)]">
                <h2 className="text-[1.1rem] font-bold m-0 mb-3 text-white">{deck.name}</h2>
'''
content = re.sub(deck_card_pattern, new_top, content, flags=re.DOTALL)

# Now replace the bottom bar (Responder, Add, Search buttons)
bottom_bar_pattern = r'<div className="bg-\[var\(--bg-glass\)\] p-4 flex gap-3">.*?</div>\s*</div>'
new_bottom = '''
              </div>
              <div className="bg-[var(--bg-glass)] p-3 flex">
                <Button className="flex-1 py-5 text-sm font-bold rounded-lg bg-[var(--accent-primary)] hover:brightness-110 text-white" onClick={(e) => { e.stopPropagation(); navigate(`/hub/${deck.id}`); }}>
                  Entrar al Hub
                </Button>
              </div>
            </div>'''

content = re.sub(bottom_bar_pattern, new_bottom, content, flags=re.DOTALL)

with open('frontend/src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
