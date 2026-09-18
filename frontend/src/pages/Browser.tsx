import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { decksApi, notesApi, studyApi } from '../services/api';
import { Deck, Note } from '../types';

type BrowserNote = Note & { parsedFields: any, state: string };

export default function Browser() {
  const [searchParams] = useSearchParams();
  const initialDeck = searchParams.get('deck');
  
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>(initialDeck || '');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState<BrowserNote[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<BrowserNote | null>(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  
  
  useEffect(() => {
    decksApi.getAll().then(data => {
      setDecks(data);
      if (data.length > 0 && !initialDeck) setSelectedDeckId(data[0].id);
      else if (initialDeck) setSelectedDeckId(initialDeck);
      else setLoading(false);
    });
  }, [initialDeck]);

  useEffect(() => {
    if (!selectedDeckId) return;
    setLoading(true);
    notesApi.getByDeck(selectedDeckId).then(async (data) => {
      const allTags = new Set<string>();
      data.forEach(n => {
        if (n.tags) n.tags.split(',').forEach(t => allTags.add(t.trim()));
      });
      setTags(Array.from(allTags).filter(t => t));

      const cards = await studyApi.getDueCards(selectedDeckId, 10000);
      const cardStateMap: Record<string, string> = {};
      cards.forEach(c => {
        cardStateMap[c.card.noteId] = c.card.state;
      });

      const processed: BrowserNote[] = data.map(n => ({
        ...n,
        parsedFields: JSON.parse(n.fieldsJson || '{}'),
        state: cardStateMap[n.id] || 'new'
      }));
      setNotes(processed);
      setLoading(false);
    }).catch(() => {
      toast.error('Error al cargar notas');
      setLoading(false);
    });
  }, [selectedDeckId]);

  const filteredNotes = notes.filter(n => {
    const matchSearch = (n.parsedFields.front || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (n.parsedFields.back || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchTag = selectedTag ? (n.tags && n.tags.includes(selectedTag)) : true;
    return matchSearch && matchTag;
  });

  const handleEditClick = (note: BrowserNote) => {
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
      toast.success('Nota actualizada');
    } catch (e) {
      toast.error('Error guardando');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingNoteId) return;
    try {
      await notesApi.delete(deletingNoteId);
      setNotes(notes.filter(n => n.id !== deletingNoteId));
      toast.success('Nota eliminada');
    } catch (e) {
      toast.error('Error al eliminar');
    } finally {
      setDeletingNoteId(null);
    }
  };

  const getStateColor = (state: string) => {
    if (state === 'new') return 'var(--accent-primary)';
    if (state === 'learning' || state === 'relearning') return '#F59E0B';
    if (state === 'review') return '#10B981';
    return 'var(--text-muted)';
  };

  return (
    <div className="fade-in pb-12">
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        <div>
          <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Mazo</label>
          <div className="pills-row">
            {decks.length === 0 && <span className="pill">Sin mazos</span>}
            {decks.map(d => (
              <button
                key={d.id}
                className={`pill ${selectedDeckId === d.id ? 'active' : ''}`}
                onClick={() => setSelectedDeckId(d.id)}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>

        {tags.length > 0 && (
          <div>
            <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Etiqueta</label>
            <div className="pills-row">
              <button
                className={`pill ${selectedTag === '' ? 'active' : ''}`}
                onClick={() => setSelectedTag('')}
              >
                Todas
              </button>
              {tags.map(t => (
                <button
                  key={t}
                  className={`pill ${selectedTag === t ? 'active' : ''}`}
                  onClick={() => setSelectedTag(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <input
            className="form-input"
            placeholder="🔍 Buscar en tarjetas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="spinner" />
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', borderStyle: 'dashed' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>🔍</div>
            <p style={{ color: 'var(--text-muted)' }}>No se encontraron tarjetas</p>
          </div>
        ) : (
          filteredNotes.map(note => (
            <div key={note.id} style={{ background: 'var(--bg-primary)', borderRadius: '12px', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', border: '1px solid var(--border-subtle)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '3px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: getStateColor(note.state), letterSpacing: '0.5px' }}>
                    {note.state === 'new' ? 'NUEVA' : note.state.includes('learn') ? 'APRENDIENDO' : 'REVISIÓN'}
                  </span>
                  {note.tags && note.tags.split(',').map(t => (
                    <span key={t} style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '3px 8px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                      {t.trim()}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.4rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }} dangerouslySetInnerHTML={{ __html: note.parsedFields.front || '(Vacío)' }} />
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} dangerouslySetInnerHTML={{ __html: note.parsedFields.back || '(Vacío)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button className="icon-btn" style={{ fontSize: '0.9rem', width: '36px', height: '36px', background: 'rgba(255,255,255,0.05)' }} onClick={() => handleEditClick(note)}>✏️</button>
                <button className="icon-btn" style={{ fontSize: '0.9rem', width: '36px', height: '36px', background: 'rgba(239,68,68,0.1)', color: '#EF4444' }} onClick={() => setDeletingNoteId(note.id)}>🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>

      {editingNote && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1.25rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Editar Tarjeta</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Frente</label>
                <div 
                  className="form-input" 
                  style={{ minHeight: '80px', padding: '0.75rem' }} 
                  contentEditable 
                  dangerouslySetInnerHTML={{ __html: editingNote?.parsedFields.front || '' }}
                  onInput={e => setEditFront(e.currentTarget.innerHTML)} 
                />
              </div>
              <div>
                <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Dorso</label>
                <div 
                  className="form-input" 
                  style={{ minHeight: '80px', padding: '0.75rem' }} 
                  contentEditable 
                  dangerouslySetInnerHTML={{ __html: editingNote?.parsedFields.back || '' }}
                  onInput={e => setEditBack(e.currentTarget.innerHTML)} 
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingNote(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveEdit} disabled={saving}>
                {saving ? '...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deletingNoteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1.25rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '340px', padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Eliminar Tarjeta</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>¿Seguro que quieres eliminar esta tarjeta? Se perderá todo su historial de repasos.</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeletingNoteId(null)}>Cancelar</button>
              <button className="btn btn-danger" style={{ flex: 1, background: '#EF4444', color: 'white', border: 'none' }} onClick={confirmDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
