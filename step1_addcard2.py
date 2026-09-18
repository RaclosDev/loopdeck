import re

with open('src/pages/AddCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's use regex to replace the select
content = re.sub(r'<select[^>]*value={selectedDeckId}[^>]*>.*?</select>', 
"""<button 
                type="button"
                className="form-input" 
                onClick={() => setShowDeckSelector(true)}
                style={{ width: '100%', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-input)' }}
              >
                <span>{decks.find(d => d.id === selectedDeckId)?.name || 'Seleccionar mazo...'}</span>
                <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>▼</span>
              </button>""", content, flags=re.DOTALL)

content = re.sub(r'<select[^>]*value={selectedType}[^>]*>.*?</select>', 
"""<button 
                  type="button"
                  className="form-input" 
                  onClick={() => setShowTypeSelector(true)}
                  style={{ width: '100%', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-input)' }}
                >
                  <span>{NOTE_TYPES.find(t => t.id === selectedType)?.name || 'Básica'}</span>
                  <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>▼</span>
                </button>""", content, flags=re.DOTALL)

with open('src/pages/AddCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
