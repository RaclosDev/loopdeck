import { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { decksApi, notesApi, studyApi } from '../services/api';
import Modal from '../components/Modal';

export default function Browser() {
  const [decks, setDecks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState('');
  
  const [editingNote, setEditingNote] = useState(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [saving, setSaving] = useState(false);
  const { addToast } = useStore();

  useEffect(() => {
    decksApi.getAll().then(data => {
      setDecks(data);
      if (data.length > 0) setSelectedDeckId(data[0].id);
      else setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedDeckId) return;
    setLoading(true);
    notesApi.getByDeck(selectedDeckId).then(async (data) => {
      const allTags = new Set();
      data.forEach(n => {
        if (n.tags) n.tags.split(',').forEach(t => allTags.add(t.trim()));
      });
      setTags(Array.from(allTags).filter(t => t));

      const cards = await studyApi.getDueCards(selectedDeckId, 10000);
      const cardStateMap = {};
      cards.forEach(c => {
        cardStateMap[c.card.noteId] = c.card.state;
      });

      const processed = data.map(n => ({
        ...n,
        parsedFields: JSON.parse(n.fieldsJson || '{}'),
        state: cardStateMap[n.id] || 'new'
      }));
      setNotes(processed);
      setLoading(false);
    }).catch(() => {
      addToast('Error al cargar notas', 'error');
      setLoading(false);
    });
  }, [selectedDeckId, addToast]);

  const filteredNotes = notes.filter(n => {
    const matchSearch = (n.parsedFields.front || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (n.parsedFields.back || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchTag = selectedTag ? (n.tags && n.tags.includes(selectedTag)) : true;
    return matchSearch && matchTag;
  });

  const handleEditClick = (note) => {
    setEditingNote(note);
    setEditFront(note.parsedFields.front || '');
    setEditBack(note.parsedFields.back || '');
  };

  const handleSaveEdit = async () => {
    if (!editingNote) return;
    setSaving(true);
    try {
      const newFieldsJson = JSON.stringify({ front: editFront, back: editBack });
      await notesApi.update(editingNote.id, { fieldsJson: newFieldsJson, tags: editingNote.tags });
      setNotes(notes.map(n => n.id === editingNote.id ? { ...n, parsedFields: { front: editFront, back: editBack } } : n));
      setEditingNote(null);
      addToast('Nota actualizada', 'success');
    } catch (e) {
      addToast('Error guardando', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId) => {
    if (!window.confirm('¿Seguro que quieres eliminar esta nota y sus tarjetas?')) return;
    try {
      await notesApi.delete(noteId);
      setNotes(notes.filter(n => n.id !== noteId));
      addToast('Nota eliminada', 'success');
    } catch (e) {
      addToast('Error al eliminar', 'error');
    }
  };

  const getStateColor = (state) => {
    if (state === 'new') return 'var(--srs-new)';
    if (state === 'learning' || state === 'relearning') return 'var(--srs-learning)';
    if (state === 'review') return 'var(--srs-review)';
    return 'var(--text-muted)';
  };

  return (
    <div className="fade-in pb-10">
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <select
          className="form-input"
          value={selectedDeckId}
          onChange={(e) => setSelectedDeckId(e.target.value)}
          style={{ flex: '1 1 200px', height: '42px' }}
        >
          {decks.length === 0 && <option value="">Sin mazos</option>}
          {decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        
        <select
          className="form-input"
          value={selectedTag}
          onChange={(e) => setSelectedTag(e.target.value)}
          style={{ flex: '1 1 150px', height: '42px' }}
        >
          <option value="">Todas las etiquetas</option>
          {tags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <input
          className="form-input"
          placeholder="Buscar..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: '2 1 200px', height: '42px' }}
        />
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="spinner" />
          </div>
        ) : filteredNotes.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
            <p>No se encontraron tarjetas</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredNotes.map(note => (
              <div key={note.id} style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', color: getStateColor(note.state) }}>
                      {note.state === 'new' ? 'NUEVA' : note.state.includes('learn') ? 'APRENDER' : 'REVISIÓN'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} dangerouslySetInnerHTML={{ __html: note.parsedFields.front || '(Vacío)' }} />
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} dangerouslySetInnerHTML={{ __html: note.parsedFields.back || '(Vacío)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button className="icon-btn" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => handleEditClick(note)}>✏️</button>
                  <button className="icon-btn" style={{ fontSize: '0.8rem', padding: '6px 12px', color: '#ef4444' }} onClick={() => handleDelete(note.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!editingNote}
        onClose={() => setEditingNote(null)}
        title="Editar Tarjeta"
        footer={
          <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingNote(null)}>Cancelar</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveEdit} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Frente</label>
            <div 
              className="form-input" 
              style={{ minHeight: '80px', padding: '0.75rem' }} 
              contentEditable 
              dangerouslySetInnerHTML={{ __html: editingNote?.parsedFields.front || '' }}
              onInput={e => setEditFront(e.currentTarget.innerHTML)} 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Dorso</label>
            <div 
              className="form-input" 
              style={{ minHeight: '80px', padding: '0.75rem' }} 
              contentEditable 
              dangerouslySetInnerHTML={{ __html: editingNote?.parsedFields.back || '' }}
              onInput={e => setEditBack(e.currentTarget.innerHTML)} 
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}



