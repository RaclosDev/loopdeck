import { useState, useEffect } from 'react';
import { decksApi, notesApi } from '../services/api';

export default function Browser() {
  const [decks, setDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotes = notes.filter(note => {
    if (!searchQuery) return true;
    const fields = JSON.parse(note.fieldsJson || '{}');
    const front = (fields.front || fields.Front || fields.text || '').toLowerCase();
    const back = (fields.back || fields.Back || fields.extra || '').toLowerCase();
    const tags = (note.tags || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return front.includes(q) || back.includes(q) || tags.includes(q);
  });

  // Fetch decks on mount
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

  // Fetch notes when deck changes
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
    } catch (err) {
      alert('Error al borrar la tarjeta');
    }
  };

  return (
    <div className="dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Explorador de Tarjetas</h1>
          <p className="page-subtitle">Gestiona y edita tus tarjetas</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <label style={{ color: 'var(--text-muted)' }}>Mazo:</label>
        <select 
          className="glass-input" 
          value={selectedDeckId} 
          onChange={(e) => setSelectedDeckId(e.target.value)}
          style={{ width: '250px' }}
        >
          {decks.map(deck => (
            <option key={deck.id} value={deck.id}>{deck.name}</option>
          ))}
        </select>
        
        <div style={{ flex: 1 }} />
        
        <div style={{ position: 'relative', width: '300px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔍</span>
          <input
            type="text"
            className="glass-input"
            placeholder="Buscar en tarjetas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
        ) : notes.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No hay tarjetas en este mazo.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Anverso (Front)</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Reverso (Back)</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Etiquetas</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500, width: '100px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotes.map(note => {
                  const fields = JSON.parse(note.fieldsJson || '{}');
                  return (
                    <tr key={note.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'var(--transition-fast)' }}>
                      <td style={{ padding: '1rem', color: 'var(--text-main)' }}>{fields.front || fields.Front || fields.text || ''}</td>
                      <td style={{ padding: '1rem', color: 'var(--text-dim)' }}>{fields.back || fields.Back || fields.extra || ''}</td>
                      <td style={{ padding: '1rem' }}>
                        {note.tags ? note.tags.split(',').map(tag => (
                          <span key={tag} style={{ display: 'inline-block', background: 'rgba(139, 92, 246, 0.15)', color: '#c4b5fd', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', marginRight: '4px' }}>
                            {tag.trim()}
                          </span>
                        )) : '-'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <button 
                          onClick={() => handleDelete(note.id)}
                          className="danger-btn"
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        >
                          Borrar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
