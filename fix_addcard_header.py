import re

with open('src/pages/AddCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I will replace the <div className="page-header">...</div> up to the mass block
old_pattern = r'<div style=\{\{ display: \'flex\', flexDirection: \'column\', gap: \'16px\', marginBottom: \'24px\' \}\}>.*?(?=<div className="card" style=\{\{ padding: \'1.5rem\', marginBottom: \'1.5rem\' \}\}>|<div style=\{\{ display: \'grid\')'

new_header = r"""<div className="form-section">
          <label className="form-label">Modo de Añadido</label>
          <div className="segmented-control">
            <button 
              className={`segmented-item ${addMode === 'single' ? 'active' : ''}`}
              onClick={() => setAddMode('single')}
            >
              Manual
            </button>
            <button 
              className={`segmented-item ${addMode === 'mass' ? 'active' : ''}`}
              onClick={() => setAddMode('mass')}
            >
              Masivo IA
            </button>
          </div>
        </div>

        <div className="form-section">
          <label className="form-label">Tipo de Nota</label>
          <div className="segmented-control">
            {NOTE_TYPES.map(type => (
              <button 
                key={type.id}
                className={`segmented-item ${selectedType === type.id ? 'active' : ''}`}
                onClick={() => setSelectedType(type.id)}
                title={type.description}
              >
                {type.name}
              </button>
            ))}
          </div>
        </div>

        <div className="form-section" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label">Mazo Destino</label>
          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', justifyContent: 'space-between', padding: '1rem', borderRadius: 'var(--radius-lg)' }}
            onClick={() => setShowDeckSelector(true)}
          >
            <span style={{ fontWeight: 600 }}>{decks.find(d => d.id === selectedDeckId)?.name || 'Selecciona un mazo...'}</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>▼</span>
          </button>
        </div>
        """

content = re.sub(old_pattern, new_header, content, flags=re.DOTALL)

with open('src/pages/AddCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
