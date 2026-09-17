import { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
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

      const cards = await studyApi.getDueCards(selectedDeckId, 10000); // get all to map states
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
    if (state === 'new') return 'bg-blue-500/20 text-blue-500';
    if (state === 'learning' || state === 'relearning') return 'bg-amber-500/20 text-amber-500';
    if (state === 'review') return 'bg-emerald-500/20 text-emerald-500';
    return 'bg-secondary text-muted-foreground';
  };

  return (
    <div className="animate-in fade-in pb-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Explorador de Tarjetas</h1>
        <p className="text-muted-foreground text-sm">Gestiona y edita tus tarjetas</p>
      </div>

      <Card className="bg-card mb-6">
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <select
            className="flex h-10 w-full sm:w-[200px] rounded-md border border-input bg-secondary px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={selectedDeckId}
            onChange={(e) => setSelectedDeckId(e.target.value)}
          >
            {decks.length === 0 && <option value="">Sin mazos</option>}
            {decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          
          <select
            className="flex h-10 w-full sm:w-[150px] rounded-md border border-input bg-secondary px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
          >
            <option value="">Todas las etiquetas</option>
            {tags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <Input
            className="flex-1 min-w-[200px] h-10 bg-secondary"
            placeholder="Buscar pregunta o respuesta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card className="bg-card overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="w-8 h-8 border-4 border-t-transparent border-primary rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground text-sm">Cargando...</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center opacity-70">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-muted-foreground">No se encontraron tarjetas</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredNotes.map(note => (
              <div key={note.id} className="p-4 hover:bg-secondary/20 transition-colors flex flex-col sm:flex-row gap-4 group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={getStateColor(note.state)}>
                      {note.state === 'new' ? 'Nueva' : note.state.includes('learn') ? 'Aprender' : 'Revisión'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div 
                    className="text-sm line-clamp-2 font-medium mb-1" 
                    dangerouslySetInnerHTML={{ __html: note.parsedFields.front || '(Vacío)' }} 
                  />
                  <div 
                    className="text-sm line-clamp-2 text-muted-foreground" 
                    dangerouslySetInnerHTML={{ __html: note.parsedFields.back || '(Vacío)' }} 
                  />
                  {note.tags && (
                    <div className="flex gap-1 mt-2">
                      {note.tags.split(',').map(t => <Badge key={t} variant="outline" className="text-[10px]">{t.trim()}</Badge>)}
                    </div>
                  )}
                </div>
                <div className="flex sm:flex-col gap-2 items-end justify-center sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="secondary" size="sm" onClick={() => handleEditClick(note)}>✏️ Editar</Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(note.id)}>🗑️ Borrar</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={!!editingNote}
        onClose={() => setEditingNote(null)}
        title="Editar Tarjeta"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button variant="ghost" onClick={() => setEditingNote(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">Frente (Pregunta)</label>
            <div 
              className="min-h-[100px] rounded-md border border-input bg-secondary p-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring prose prose-invert max-w-none" 
              contentEditable 
              dangerouslySetInnerHTML={{ __html: editingNote?.parsedFields.front || '' }}
              onInput={e => setEditFront(e.currentTarget.innerHTML)} 
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">Dorso (Respuesta)</label>
            <div 
              className="min-h-[100px] rounded-md border border-input bg-secondary p-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring prose prose-invert max-w-none" 
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
