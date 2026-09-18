import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { decksApi, notesApi, studyApi } from '../services/api';
import { Deck, Note } from '../types';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Pencil, Trash2, Search, Loader2 } from 'lucide-react';

type BrowserNote = Note & { parsedFields: any, state: string };

const getStateColor = (state: string) => {
  if (state === 'new') return 'var(--accent-primary)';
  if (state.includes('learn')) return '#F59E0B';
  return '#10B981'; // review
};

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
      toast.error('Error al eliminar nota');
    } finally {
      setDeletingNoteId(null);
    }
  };

  return (
    <div className="fade-in pb-12">
      <div className="card mb-6 p-5 flex flex-col gap-5">
        <div>
          <label className="form-label mb-2 block uppercase tracking-wide text-xs">Mazo</label>
          <div className="flex flex-wrap gap-2">
            {decks.length === 0 && <Badge variant="outline">Sin mazos</Badge>}
            {decks.map(d => (
              <Badge
                key={d.id}
                variant={selectedDeckId === d.id ? "default" : "outline"}
                className="cursor-pointer text-[12px] px-3 py-1"
                onClick={() => setSelectedDeckId(d.id)}
              >
                {d.name}
              </Badge>
            ))}
          </div>
        </div>

        {tags.length > 0 && (
          <div>
            <label className="form-label mb-2 block uppercase tracking-wide text-xs">Etiqueta</label>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={selectedTag === '' ? "default" : "outline"}
                className="cursor-pointer text-[12px] px-3 py-1"
                onClick={() => setSelectedTag('')}
              >
                Todas
              </Badge>
              {tags.map(t => (
                <Badge
                  key={t}
                  variant={selectedTag === t ? "default" : "outline"}
                  className="cursor-pointer text-[12px] px-3 py-1"
                  onClick={() => setSelectedTag(t)}
                >
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="form-input w-full pl-9 h-11"
            placeholder="Buscar en tarjetas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="card border-dashed flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
            <Search className="w-12 h-12 opacity-50" />
            <p>No se encontraron tarjetas</p>
          </div>
        ) : (
          filteredNotes.map(note => (
            <div key={note.id} className="card p-4 flex gap-4 items-center flex-row">
              <div className="flex-1 min-w-0">
                <div className="flex gap-2 mb-3 items-center flex-wrap">
                  <Badge variant="outline" style={{ color: getStateColor(note.state), borderColor: getStateColor(note.state), backgroundColor: `${getStateColor(note.state)}15` }}>
                    {note.state === 'new' ? 'NUEVA' : note.state.includes('learn') ? 'APRENDIENDO' : 'REVISIÓN'}
                  </Badge>
                  {note.tags && note.tags.split(',').map(t => (
                    <Badge key={t} variant="outline">{t.trim()}</Badge>
                  ))}
                </div>
                <div className="text-[0.95rem] font-semibold mb-1 truncate text-foreground" dangerouslySetInnerHTML={{ __html: note.parsedFields.front || '(Vacío)' }} />
                <div className="text-[0.85rem] text-muted-foreground truncate" dangerouslySetInnerHTML={{ __html: note.parsedFields.back || '(Vacío)' }} />
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="secondary" size="icon" onClick={() => handleEditClick(note)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="destructive" size="icon" onClick={() => setDeletingNoteId(note.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={!!editingNote} onOpenChange={(open) => !open && setEditingNote(null)}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Tarjeta</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 my-4">
            <div>
              <label className="form-label mb-2 block uppercase tracking-wide text-xs">Frente</label>
              <div 
                className="form-input min-h-[80px] p-3" 
                contentEditable 
                dangerouslySetInnerHTML={{ __html: editingNote?.parsedFields.front || '' }}
                onInput={e => setEditFront(e.currentTarget.innerHTML)} 
              />
            </div>
            <div>
              <label className="form-label mb-2 block uppercase tracking-wide text-xs">Dorso</label>
              <div 
                className="form-input min-h-[80px] p-3" 
                contentEditable 
                dangerouslySetInnerHTML={{ __html: editingNote?.parsedFields.back || '' }}
                onInput={e => setEditBack(e.currentTarget.innerHTML)} 
              />
            </div>
          </div>
          <DialogFooter className="flex gap-3 mt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setEditingNote(null)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSaveEdit} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingNoteId} onOpenChange={(open) => !open && setDeletingNoteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Tarjeta</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm my-2">¿Seguro que quieres eliminar esta tarjeta? Se perderá todo su historial de repasos.</p>
          <DialogFooter className="mt-4 flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setDeletingNoteId(null)}>Cancelar</Button>
            <Button variant="destructive" className="flex-1" onClick={confirmDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}