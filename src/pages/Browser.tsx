import { useState, useEffect } from 'react';
import { decksApi, notesApi } from '../services/api';

export default function Browser() {
  const [decks, setDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  const uniqueTags = [...new Set(notes.flatMap(n => (n.tags || '').toLowerCase().trim().split(/\s+/).filter(Boolean)))].sort();

  const filteredNotes = notes.filter(note => {
    const tags = (note.tags || '').toLowerCase();
    
    if (selectedTag && !tags.split(/\s+/).includes(selectedTag)) {
      return false;
    }

    if (!searchQuery) return true;
    let fields = {};
    try { fields = JSON.parse(note.fieldsJson || '{}'); } catch {}
    const front = (fields.front || fields.Front || fields.text || '').toLowerCase().replace(/<[^>]*>/g, ' ');
    const back = (fields.back || fields.Back || fields.extra || '').toLowerCase().replace(/<[^>]*>/g, ' ');
    const q = searchQuery.toLowerCase();
    return front.includes(q) || back.includes(q) || tags.includes(q);
  });

  useEffect(() => {
    decksApi.getAll()
      .then(data => {
        setDecks(data);
        if (data.length > 0) {
          setSelectedDeckId(data[0].id);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedDeckId) return;
    setLoading(true);
    notesApi.getByDeck(selectedDeckId)
      .then(data => setNotes(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedDeckId]);

  const handleDelete = async (noteId) => {
    if (!window.confirm('¿Seguro que quieres borrar esta tarjeta?')) return;
    try {
      await notesApi.delete(noteId);
      setNotes(notes.filter(n => n.id !== noteId));
    } catch {
      alert('Error al borrar la tarjeta');
    }
  };

  const getTextFromHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const getImgSrc = (html) => {
    if (!html) return null;
    const m = html.match(/<img[^>]+src="([^">]+)"/);
    return m ? m[1] : null;
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Explorador de Tarjetas</h1>
        <p>Gestiona y edita tus tarjetas</p>
      </div>

      {/* Filters */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="glass-select"
            value={selectedDeckId}
            onChange={(e) => setSelectedDeckId(e.target.value)}
            style={{ flex: '1', minWidth: '150px' }}
          >
            {decks.map(deck => (
              <option key={deck.id} value={deck.id}>{deck.name}</option>
            ))}
          </select>

          {uniqueTags.length > 0 && (
            <select
              className="glass-select"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              style={{ flex: '1', minWidth: '120px', maxWidth: '180px' }}
            >
              <option value="">Todas las tags</option>
              {uniqueTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          )}

          <div style={{ position: 'relative', flex: '2', minWidth: '180px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>🔍</span>
            <input
              type="text"
              className="glass-input"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>
        </div>

        {filteredNotes.length > 0 && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            {filteredNotes.length} tarjeta{filteredNotes.length !== 1 ? 's' : ''} encontrada{filteredNotes.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Cards list */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spinner-sm" style={{ width: 32, height: 32, margin: '0 auto 12px', borderWidth: 3 }} />
            <p>Cargando...</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            {notes.length === 0 ? 'No hay tarjetas en este mazo.' : 'No hay resultados para tu búsqueda.'}
          </div>
        ) : (
          <div>
            {filteredNotes.map((note, idx) => {
              let fields = {};
              try { fields = JSON.parse(note.fieldsJson || '{}'); } catch {}
              const frontText = getTextFromHtml(fields.front || fields.Front || fields.text || '');
              const backText = getTextFromHtml(fields.back || fields.Back || fields.extra || '');
              const frontImg = getImgSrc(fields.front || fields.Front || fields.text || '');
              const tagList = (note.tags || '').trim().split(/\s+/).filter(Boolean);

              return (
                <div
                  key={note.id}
                  style={{
                    padding: '1rem',
                    borderBottom: idx < filteredNotes.length - 1 ? '1px solid var(--border-color)' : 'none',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Thumbnail */}
                  {frontImg && (
                    <div style={{
                      width: 48, height: 48, borderRadius: 8, overflow: 'hidden',
                      flexShrink: 0, border: '1px solid var(--border-color)',
                    }}>
                      <img src={frontImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: '0.9rem',
                      marginBottom: '2px',
                    }}>
                      {frontText || (frontImg ? '🖼️ Imagen' : '—')}
                    </div>
                    {backText && (
                      <div style={{
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '0.8rem',
                        marginBottom: '4px',
                      }}>
                        {backText}
                      </div>
                    )}
                    {tagList.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {tagList.map(tag => (
                          <span key={tag} style={{
                            display: 'inline-block',
                            background: 'rgba(139, 92, 246, 0.15)',
                            color: '#c4b5fd',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            padding: '1px 7px',
                            borderRadius: '12px',
                            fontSize: '0.7rem',
                          }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(note.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--danger-color)',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '1.1rem',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      minWidth: 36,
                      minHeight: 36,
                      justifyContent: 'center',
                      opacity: 0.7,
                      transition: 'opacity 0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.opacity = 1}
                    onMouseOut={e => e.currentTarget.style.opacity = 0.7}
                    title="Borrar tarjeta"
                  >
                    🗑️
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
