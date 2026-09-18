import re

with open('src/pages/AddCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add states for Bottom Sheets
state_injection = """  const [showDeckSelector, setShowDeckSelector] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);"""

content = content.replace("const [massGenerating, setMassGenerating] = useState<boolean>(false);", "const [massGenerating, setMassGenerating] = useState<boolean>(false);\n" + state_injection)

# Replace native selects with Buttons that open sheets
old_selects = """          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>MAZO</label>
              <select 
                className="form-input" 
                value={selectedDeckId} 
                onChange={e => setSelectedDeckId(e.target.value)}
                style={{ width: '100%', height: '42px' }}
              >
                <option value="">Seleccionar mazo...</option>
                {decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            
            {addMode === 'single' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>TIPO DE NOTA</label>
                <select 
                  className="form-input" 
                  value={selectedType} 
                  onChange={e => { setSelectedType(e.target.value); clearEditor(); }}
                  style={{ width: '100%', height: '42px' }}
                >
                  {NOTE_TYPES.map(t => <option key={t.id} value={t.id}>{t.name} — {t.description}</option>)}
                </select>
              </div>
            )}
          </div>"""

new_selectors = """          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>MAZO</label>
              <button 
                type="button"
                className="form-input" 
                onClick={() => setShowDeckSelector(true)}
                style={{ width: '100%', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-input)' }}
              >
                <span>{decks.find(d => d.id === selectedDeckId)?.name || 'Seleccionar mazo...'}</span>
                <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>▼</span>
              </button>
            </div>
            
            {addMode === 'single' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>TIPO DE NOTA</label>
                <button 
                  type="button"
                  className="form-input" 
                  onClick={() => setShowTypeSelector(true)}
                  style={{ width: '100%', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-input)' }}
                >
                  <span>{NOTE_TYPES.find(t => t.id === selectedType)?.name || 'Básica'}</span>
                  <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>▼</span>
                </button>
              </div>
            )}
          </div>"""

content = content.replace(old_selects, new_selectors)

# Remove blue box for Mass Add
old_mass_box = """            <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#60a5fa' }}>✨ Generación Mágica con Inteligencia Artificial</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                Escribe o pega una lista de conceptos, palabras clave o frases (separados por comas o saltos de línea). La IA se encargará de buscar una definición súper breve para cada uno y creará todas las tarjetas de golpe.
              </p>
            </div>"""

new_mass_box = """            <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Escribe o pega una lista de conceptos (separados por comas o saltos de línea) para generar las tarjetas.
            </p>"""

content = content.replace(old_mass_box, new_mass_box)

# Add Bottom Sheets at the end of the return statement
sheets = """
      {showDeckSelector && (
        <div className="bottom-sheet-overlay" onClick={() => setShowDeckSelector(false)}>
          <div className="bottom-sheet-content" onClick={e => e.stopPropagation()}>
            <div className="bottom-sheet-drag-handle" />
            <h3 className="bottom-sheet-title">Seleccionar Mazo</h3>
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {decks.map(d => (
                <button
                  key={d.id}
                  className={`bottom-sheet-item ${selectedDeckId === d.id ? 'active' : ''}`}
                  onClick={() => { setSelectedDeckId(d.id); setShowDeckSelector(false); }}
                >
                  <span>{d.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showTypeSelector && (
        <div className="bottom-sheet-overlay" onClick={() => setShowTypeSelector(false)}>
          <div className="bottom-sheet-content" onClick={e => e.stopPropagation()}>
            <div className="bottom-sheet-drag-handle" />
            <h3 className="bottom-sheet-title">Tipo de Nota</h3>
            <div>
              {NOTE_TYPES.map(t => (
                <button
                  key={t.id}
                  className={`bottom-sheet-item ${selectedType === t.id ? 'active' : ''}`}
                  onClick={() => { setSelectedType(t.id); clearEditor(); setShowTypeSelector(false); }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span>{t.name}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
"""

content = content.replace("      {imageSearchModalInfo && (", sheets + "\n      {imageSearchModalInfo && (")

with open('src/pages/AddCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

