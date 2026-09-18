import os
import re

with open('src/pages/AddCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'\n\s*return\s*\(', content)
if not match:
    print("Could not find return")
    exit(1)

start_idx = match.start()
pre_return = content[:start_idx]

if 'isCreatingDeck' not in pre_return:
    insert_point = pre_return.find('const frontFileRef')
    state_to_add = '''  const [isCreatingDeck, setIsCreatingDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  
  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) {
        setIsCreatingDeck(false);
        return;
    }
    try {
        const newDeck = await decksApi.create({ name: newDeckName.trim() });
        setDecks([...decks, newDeck]);
        setSelectedDeckId(newDeck.id);
        setNewDeckName('');
        setIsCreatingDeck(false);
    } catch (err) {
        addToast('Error al crear mazo', 'error');
    }
  };
  
'''
    pre_return = pre_return[:insert_point] + state_to_add + pre_return[insert_point:]

new_return = '''
  return (
    <div className="fade-in pb-12">
      <div style={{
        display: 'flex',
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '0.35rem',
        borderRadius: '20px',
        marginBottom: '1.5rem',
        position: 'relative',
        maxWidth: '420px',
        width: '100%',
        marginLeft: 'auto',
        marginRight: 'auto'
      }}>
        <button
          onClick={() => setAddMode('single')}
          style={{
            flex: 1,
            padding: '0.65rem',
            borderRadius: '16px',
            background: addMode === 'single' ? 'var(--bg-card)' : 'transparent',
            color: addMode === 'single' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: addMode === 'single' ? 600 : 500,
            boxShadow: addMode === 'single' ? '0 4px 16px rgba(0,0,0,0.4)' : 'none',
            border: addMode === 'single' ? '1px solid var(--border-medium)' : '1px solid transparent',
            transition: 'all 0.25s ease',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          Una a una
        </button>
        <button
          onClick={() => setAddMode('mass')}
          style={{
            flex: 1,
            padding: '0.65rem',
            borderRadius: '16px',
            background: addMode === 'mass' ? 'var(--bg-card)' : 'transparent',
            color: addMode === 'mass' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: addMode === 'mass' ? 600 : 500,
            boxShadow: addMode === 'mass' ? '0 4px 16px rgba(0,0,0,0.4)' : 'none',
            border: addMode === 'mass' ? '1px solid var(--border-medium)' : '1px solid transparent',
            transition: 'all 0.25s ease',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          En masa
        </button>
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <label className="form-label">Mazo</label>
        <div className="filter-chips-row" style={{ paddingBottom: '0.5rem' }}>
          {decks.map(d => (
            <button
              key={d.id}
              className={ilter-chip }
              onClick={() => setSelectedDeckId(d.id)}
            >
              {d.name}
            </button>
          ))}
          {!isCreatingDeck ? (
            <button className="filter-chip" onClick={() => setIsCreatingDeck(true)}>
              + Nuevo
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                className="form-input" 
                style={{ padding: '0.35rem 0.75rem', minHeight: 'auto', borderRadius: '20px', width: '140px', fontSize: '0.85rem' }} 
                autoFocus 
                value={newDeckName} 
                onChange={e => setNewDeckName(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleCreateDeck()}
                onBlur={handleCreateDeck}
                placeholder="Nombre..." 
              />
            </div>
          )}
        </div>

        {addMode === 'single' && (
          <div style={{ marginTop: '1.25rem' }}>
            <label className="form-label">Tipo de nota</label>
            <div className="filter-chips-row">
              {NOTE_TYPES.map(t => (
                <button
                  key={t.id}
                  className={ilter-chip }
                  onClick={() => setSelectedType(t.id)}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <div className="form-hint" style={{ marginTop: '0.5rem' }}>
              {NOTE_TYPES.find(t => t.id === selectedType)?.description}
            </div>
          </div>
        )}
      </div>

      <input ref={frontFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileSelected('front', e)} />
      <input ref={backFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileSelected('back', e)} />

      {addMode === 'mass' ? (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            ✨ Genera mltiples tarjetas de golpe pegando texto o apuntes.
          </div>
          <textarea 
            className="form-input" 
            style={{ minHeight: '200px', resize: 'vertical', marginBottom: '1.25rem' }}
            value={massInput}
            onChange={e => setMassInput(e.target.value)}
            placeholder="Ejemplo: Polimorfismo, Herencia..."
          />
          <button 
            className="btn btn-primary" 
            style={{ width: '100%' }} 
            onClick={handleMassAdd}
            disabled={massGenerating}
          >
            {massGenerating ? <span className="spinner-sm" /> : '✨ Generar y Aadir'}
          </button>
        </div>
      ) : (
        <div className="desktop-grid" style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Front */}
            <div>
              <label className="form-label">Frente</label>
              <div className="mobile-scroll-x" style={{ display: 'flex', gap: '0.3rem', padding: '0.35rem', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.02)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)', marginBottom: '0.75rem' }}>
                <button style={{ flex: '1 0 auto', padding: '0.45rem 0.6rem', borderRadius: '10px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', minWidth: '90px', display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={handleDefinition} disabled={lookingUpDef}>
                  ✨ {lookingUpDef ? '...' : 'Def. IA'}
                </button>
                <button style={{ flex: '1 0 auto', padding: '0.45rem 0.6rem', borderRadius: '10px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', minWidth: '90px', display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={handleAutoImage} disabled={lookingUpImage}>
                  📸 {lookingUpImage ? '...' : 'Foto Auto'}
                </button>
                <button style={{ flex: '1 0 auto', padding: '0.45rem 0.6rem', borderRadius: '10px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', minWidth: '90px', display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={() => handleGalleryPick('front')}>
                  🖼️ Galera
                </button>
                <button style={{ flex: '1 0 auto', padding: '0.45rem 0.6rem', borderRadius: '10px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', minWidth: '90px', display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={() => handleOpenImageSearch('front')}>
                  🔍 Buscar
                </button>
              </div>
              <div 
                className="form-input" 
                style={{ minHeight: '140px', borderRadius: '12px', background: 'var(--bg-input)' }}
                contentEditable 
                ref={frontContentRef}
                onInput={handleFieldChange('front')} 
                onPaste={handlePaste('front')}
              />
            </div>

            {/* Back */}
            <div>
              <label className="form-label">Dorso</label>
              <div className="mobile-scroll-x" style={{ display: 'flex', gap: '0.3rem', padding: '0.35rem', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.02)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)', marginBottom: '0.75rem' }}>
                <button style={{ flex: '1 0 auto', padding: '0.45rem 0.6rem', borderRadius: '10px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', minWidth: '90px', display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={() => handleGalleryPick('back')}>
                  🖼️ Galera
                </button>
                <button style={{ flex: '1 0 auto', padding: '0.45rem 0.6rem', borderRadius: '10px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', minWidth: '90px', display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={() => handleOpenImageSearch('back')}>
                  🔍 Buscar
                </button>
              </div>
              <div 
                className="form-input" 
                style={{ minHeight: '140px', borderRadius: '12px', background: 'var(--bg-input)' }}
                contentEditable 
                ref={backContentRef}
                onInput={handleFieldChange('back')} 
                onPaste={handlePaste('back')}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="form-label">Etiquetas</label>
              <div className="form-input" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', minHeight: '44px', alignItems: 'center' }} onClick={() => tagInputRef.current?.focus()}>
                {tags.map(tag => (
                  <span key={tag} style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary-light)', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {tag}
                    <span style={{ cursor: 'pointer', opacity: 0.7 }} onClick={(e) => { e.stopPropagation(); removeTag(tag); }}>×</span>
                  </span>
                ))}
                <input
                  ref={tagInputRef}
                  style={{ flex: 1, minWidth: '120px', background: 'transparent', border: 'none', outline: 'none', color: 'inherit' }}
                  placeholder={tags.length === 0 ? 'Aadir etiquetas...' : ''}
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleAdd(false)} disabled={saving}>
                {saving ? '...' : 'Aadir (Ctrl+Enter)'}
              </button>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => handleAdd(true)} disabled={saving}>
                Aadir y cerrar
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '400px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '16px' }}>
              <div style={{ textAlign: 'center', fontSize: '1.1rem' }} dangerouslySetInnerHTML={{ __html: fields.front || '<span style="color:var(--text-muted)">Frente...</span>' }} />
              <div style={{ height: '1px', width: '66%', background: 'var(--border-subtle)', margin: '1.5rem auto' }} />
              <div style={{ textAlign: 'center', fontSize: '1.1rem', flex: 1 }} dangerouslySetInnerHTML={{ __html: fields.back || '<span style="color:var(--text-muted)">Dorso...</span>' }} />
              {tags.length > 0 && (
                <div className="filter-chips-row" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
                  {tags.map(tag => <span key={tag} className="filter-chip" style={{ cursor: 'default' }}>{tag}</span>)}
                </div>
              )}
            </div>
          </div>
          
        </div>
      )}

      {imageSearchModalInfo && (
        <ImageSearchModal
          isOpen={true}
          initialQuery={imageSearchModalInfo.query}
          onSelect={(base64: string) => handleImageSearchSelect(base64, imageSearchModalInfo.field)}
          onClose={() => setImageSearchModalInfo(null)}
        />
      )}
    </div>
  );
}
'''

new_content = pre_return + new_return
with open('src/pages/AddCard.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Updated AddCard.tsx")
