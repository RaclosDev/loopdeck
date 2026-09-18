import re

with open('frontend/src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the bottom part of the card (the three buttons -> one big button)
pattern = r'<div className="bg-\[var\(--bg-glass\)\] p-4 flex gap-3">.*?</div>\n            </div>\n          \);\n        }\)}'

replacement = '''<div className="bg-[var(--bg-glass)] p-3 flex">
                <Button className="flex-1 py-5 text-sm font-bold rounded-lg bg-[var(--accent-primary)] hover:brightness-110 text-white" onClick={(e) => { e.stopPropagation(); navigate(`/hub/${deck.id}`); }}>
                  Entrar al Hub
                </Button>
              </div>
            </div>
          );
        })}'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('frontend/src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
