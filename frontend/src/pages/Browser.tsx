import toast from 'react-hot-toast';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { notesApi, studyApi } from '../services/api';
import { Note } from '../types';
import { useDecks } from '../hooks/useDecks';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Skeleton } from '../components/ui/skeleton';
import { Pencil, Trash2, Search, Loader2 } from 'lucide-react';

type BrowserNote = Note & { parsedFields: Record<string, string>, state: string };

const getStateColor = (state: string) => {
  if (state === 'new') return 'var(--accent-primary)';
  if (state.includes('learn')) return '#F59E0B';
  return '#10B981'; // review
};

export default function Browser() {
  const [searchParams] = useSearchParams();
  const initialDeck = searchParams.get('deck');
  
  const { data: decks = [], isLoading: loadingDecks } = useDecks();
  const [selectedDeckId, setSelectedDeckId] = useState<string>(initialDeck || '');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editingNote, setEditingNote] = useState<BrowserNote | null>(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // Sync selected deck when decks load
  useEffect(() => {
    if (decks.length > 0 && !selectedDeckId) {
      setSelectedDeckId(initialDeck || decks[0].id);
    }
  }, [decks, initialDeck, selectedDeckId]);

  const { data: browserData, isLoading: loadingNotes, refetch: refetchNotes } = useQuery({
    queryKey: ['browserNotes', selectedDeckId],
    queryFn: async () => {
      const data = await notesApi.getByDeck(selectedDeckId);
      const cards = await studyApi.getDueCards(selectedDeckId, 10000);
      
      const allTags = new Set<string>();
      const cardStateMap: Record<string, string> = {};
      
      cards.forEach(c => {
        cardStateMap[c.card.noteId] = c.card.state;
      });

      const processed: BrowserNote[] = data.map(n => {
        if (n.tags) n.tags.split(',').forEach(t => allTags.add(t.trim()));
        return {
          ...n,
          parsedFields: JSON.parse(n.fieldsJson || '{}'),
          state: cardStateMap[n.id] || 'new'
        };
      });

      return { notes: processed, tags: Array.from(allTags).filter(t => t) };
    },
    enabled: !!selectedDeckId,
    staleTime: 60 * 1000, // 1 minute
  });

  const notes = browserData?.notes || [];
  const tags = browserData?.tags || [];
  const loading = loadingDecks || loadingNotes || !selectedDeckId;

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
      await refetchNotes();
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
      await refetchNotes();
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
            {decks.length === 0 && <div style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>Sin mazos</div>}
            {decks.map(d => (
              <button key={d.id} onClick={() => setSelectedDeckId(d.id)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '8px', cursor: 'pointer', border: 'none', background: selectedDeckId === d.id ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: selectedDeckId === d.id ? 'var(--accent-text, white)' : 'var(--text-secondary)', fontWeight: selectedDeckId === d.id ? 600 : 400, transition: 'all 0.2s ease', whiteSpace: 'nowrap' }}>{d.name}</button>
            ))}
          </div>
        </div>

        {tags.length > 0 && (
          <div>
            <label className="form-label mb-2 block uppercase tracking-wide text-xs">Etiqueta</label>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setSelectedTag('')} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '8px', cursor: 'pointer', border: 'none', background: selectedTag === '' ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: selectedTag === '' ? 'var(--accent-text, white)' : 'var(--text-secondary)', fontWeight: selectedTag === '' ? 600 : 400, transition: 'all 0.2s ease', whiteSpace: 'nowrap' }}>Todas</button>
              {tags.map(t => (
                <button key={t} onClick={() => setSelectedTag(t)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '8px', cursor: 'pointer', border: 'none', background: selectedTag === t ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: selectedTag === t ? 'var(--accent-text, white)' : 'var(--text-secondary)', fontWeight: selectedTag === t ? 600 : 400, transition: 'all 0.2s ease', whiteSpace: 'nowrap' }}>{t}</button>
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
          <div className="flex flex-col gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="card p-4 flex gap-4 items-center flex-row">
                <div className="flex-1 min-w-0">
                  <div className="flex gap-2 mb-3 items-center">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <Skeleton className="h-10 w-10 rounded-md" />
                </div>
              </div>
            ))}
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