import { parseNoteFields } from '../lib/noteFields';
import { useAuth } from '../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateStudyData } from '../lib/queryInvalidation';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { sanitizeHtml } from '../lib/utils';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { notesApi } from '../services/api';
import { Note } from '../types';
import { useDecks } from '../hooks/useDecks';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { Skeleton } from '../components/ui/skeleton';
import { Pencil, Trash2, Search, Loader2, AlertCircle } from 'lucide-react';

type BrowserNote = Note & { parsedFields: Record<string, string>; state: string };

const getStateColor = (state: string) => {
  if (state === 'new') return 'var(--accent-primary)';
  if (state.includes('learn')) return 'var(--srs-learning)';
  return 'var(--srs-review)';
};

export default function Browser() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDeck = searchParams.get('deck');

  const {
    data: decks = [],
    isLoading: loadingDecks,
    isError: errorDecks,
    refetch: retryDecks,
  } = useDecks();
  const selectedDeckId = decks.find((deck) => deck.id === initialDeck)?.id || decks[0]?.id || '';
  const selectedTag = searchParams.get('tag') || '';
  const search = searchParams.get('q') || '';
  const page = Math.min(100_000, Math.max(0, Math.floor(Number(searchParams.get('page')) || 0)));
  const [searchQuery, setSearchQuery] = useState(search);
  useEffect(() => setSearchQuery(search), [search]);
  useEffect(() => {
    if (searchQuery === search) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      params.set('q', searchQuery);
      params.delete('page');
      setSearchParams(params, { replace: true });
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, search, searchParams, setSearchParams]);
  const changeFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    value ? params.set(key, value) : params.delete(key);
    if (key !== 'page') params.delete('page');
    if (key === 'deck') params.delete('tag');
    setSearchParams(params, { replace: true });
  };

  const [editingNote, setEditingNote] = useState<BrowserNote | null>(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const {
    data: browserData,
    isLoading: loadingNotes,
    isError: isErrorNotes,
    refetch: refetchNotes,
  } = useQuery({
    queryKey: ['notePage', selectedDeckId, user?.id, page, search, selectedTag],
    queryFn: ({ signal }) => notesApi.getPage(selectedDeckId, page, search, selectedTag, signal),
    enabled: !!selectedDeckId,
    staleTime: 60_000,
  });
  const { data: tags = [] } = useQuery({
    queryKey: ['noteTags', selectedDeckId, user?.id],
    queryFn: ({ signal }) => notesApi.getTags(selectedDeckId, signal),
    enabled: !!selectedDeckId,
    staleTime: 300_000,
  });
  const filteredNotes: BrowserNote[] = (browserData?.items || []).map(({ note, state }) => ({
    ...note,
    state,
    parsedFields: parseNoteFields(note.fieldsJson),
  }));
  const total = browserData?.total || 0;
  const loading = loadingDecks || loadingNotes || !selectedDeckId;
  useEffect(() => {
    if (browserData && !browserData.items.length && page > 0)
      changeFilter('page', String(Math.max(0, Math.ceil(browserData.total / 25) - 1)));
  }, [browserData, page]);

  const handleEditClick = (note: BrowserNote) => {
    setEditingNote(note);
    setEditFront(note.parsedFields[note.noteType === 'cloze' ? 'text' : 'front'] || '');
    setEditBack(note.parsedFields.back || '');
  };

  const handleSaveEdit = async () => {
    if (!editingNote) return;
    setSaving(true);
    try {
      const fields = { ...editingNote.parsedFields };
      if (editingNote.noteType === 'cloze') fields.text = editFront;
      else {
        fields.front = editFront;
        fields.back = editBack;
      }
      const newFieldsJson = JSON.stringify(fields);
      await notesApi.update(editingNote.id, { fieldsJson: newFieldsJson, tags: editingNote.tags });
      await invalidateStudyData(queryClient, selectedDeckId);
      setEditingNote(null);
      toast.success('Nota actualizada');
    } catch {
      toast.error('Error guardando');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingNoteId) return;
    try {
      await notesApi.delete(deletingNoteId);
      await invalidateStudyData(queryClient, selectedDeckId);
      toast.success('Nota eliminada');
    } catch {
      toast.error('Error al eliminar nota');
    } finally {
      setDeletingNoteId(null);
    }
  };

  if (errorDecks)
    return (
      <div className="card page-state" role="alert">
        <h2>No se han podido cargar tus mazos</h2>
        <button className="sheet-action" onClick={() => void retryDecks()}>
          Reintentar
        </button>
      </div>
    );
  if (!loadingDecks && decks.length === 0)
    return (
      <div className="card page-state">
        <h2>Todavía no tienes mazos</h2>
        <p>Crea un mazo para añadir y organizar tus tarjetas.</p>
        <Link className="sheet-action" to="/">
          Ir a Mis Mazos
        </Link>
      </div>
    );

  return (
    <div className="fade-in browser-page">
      <div className="card browser-filters">
        <div className="browser-filter-field">
          <label htmlFor="browser-deck">Mazo</label>
          <select
            id="browser-deck"
            className="form-input"
            value={selectedDeckId}
            onChange={(e) => {
              changeFilter('deck', e.target.value);
            }}
          >
            {decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.name}
              </option>
            ))}
          </select>
        </div>
        <div className="browser-filter-field">
          <label htmlFor="browser-tag">Etiqueta</label>
          <select
            id="browser-tag"
            className="form-input"
            value={selectedTag}
            onChange={(e) => changeFilter('tag', e.target.value)}
          >
            <option value="">Todas</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
        <div className="browser-filter-field">
          <label htmlFor="browser-search">Buscar</label>
          <span className="browser-search">
            <Search size={18} aria-hidden="true" />
            <input
              id="browser-search"
              type="search"
              className="form-input browser-search-input"
              placeholder="Pregunta o respuesta"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </span>
        </div>
      </div>
      {!loading && !isErrorNotes && (
        <p className="results-count" role="status">
          {total} {total === 1 ? 'nota' : 'notas'}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {isErrorNotes ? (
          <div className="card border-dashed flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
            <AlertCircle className="w-12 h-12 text-destructive opacity-80" />
            <p className="text-foreground font-medium">Error al cargar las tarjetas del mazo</p>
            <Button variant="secondary" size="sm" onClick={() => refetchNotes()}>
              Reintentar
            </Button>
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
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
          filteredNotes.map((note) => (
            <div key={note.id} className="card p-4 flex gap-4 items-center flex-row">
              <div className="flex-1 min-w-0">
                <div className="flex gap-2 mb-3 items-center flex-wrap">
                  <Badge
                    variant="outline"
                    style={{
                      color: getStateColor(note.state),
                      borderColor: getStateColor(note.state),
                      backgroundColor: 'transparent',
                    }}
                  >
                    {note.state === 'new'
                      ? 'NUEVA'
                      : note.state.includes('learn')
                        ? 'APRENDIENDO'
                        : 'REVISIÓN'}
                  </Badge>
                  {note.tags &&
                    note.tags.split(',').map((t) => (
                      <Badge key={t} variant="outline">
                        {t.trim()}
                      </Badge>
                    ))}
                </div>
                <div
                  className="text-[0.95rem] font-semibold mb-1 note-content text-foreground"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(
                      note.parsedFields.front || note.parsedFields.text || '(Vacío)',
                    ),
                  }}
                />
                <div
                  className="text-[0.85rem] text-muted-foreground note-content"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(note.parsedFields.back || '(Vacío)'),
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="Editar tarjeta"
                  onClick={() => handleEditClick(note)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  aria-label="Eliminar tarjeta"
                  onClick={() => setDeletingNoteId(note.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {total > 25 && (
        <nav
          className="flex flex-wrap items-center justify-between gap-3 my-6"
          aria-label="Páginas de notas"
        >
          <Button
            variant="secondary"
            disabled={page === 0 || loading}
            onClick={() => changeFilter('page', String(page - 1))}
          >
            Anterior
          </Button>
          <span
            role="status"
            className="order-first w-full text-center whitespace-nowrap sm:order-none sm:w-auto"
          >
            Página {page + 1} de {Math.ceil(total / 25)}
          </span>
          <Button
            variant="secondary"
            disabled={(page + 1) * 25 >= total || loading}
            onClick={() => changeFilter('page', String(page + 1))}
          >
            Siguiente
          </Button>
        </nav>
      )}
      <Dialog
        open={!!editingNote}
        onOpenChange={(open) => !open && !saving && setEditingNote(null)}
      >
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Tarjeta</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 my-4">
            <div>
              <label className="form-label mb-2 block uppercase tracking-wide text-xs">
                {editingNote?.noteType === 'cloze' ? 'Texto con huecos' : 'Frente'}
              </label>
              <div
                className="form-input min-h-[80px] p-3"
                contentEditable
                role="textbox"
                aria-multiline="true"
                aria-label="Frente de la tarjeta"
                tabIndex={0}
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(
                    editingNote?.parsedFields[
                      editingNote.noteType === 'cloze' ? 'text' : 'front'
                    ] || '',
                  ),
                }}
                onInput={(e) => setEditFront(e.currentTarget.innerHTML)}
              />
            </div>
            {editingNote?.noteType !== 'cloze' && (
              <div>
                <label className="form-label mb-2 block uppercase tracking-wide text-xs">
                  Dorso
                </label>
                <div
                  className="form-input min-h-[80px] p-3"
                  contentEditable
                  role="textbox"
                  aria-multiline="true"
                  aria-label="Dorso de la tarjeta"
                  tabIndex={0}
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(editingNote?.parsedFields.back || ''),
                  }}
                  onInput={(e) => setEditBack(e.currentTarget.innerHTML)}
                />
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-3 mt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setEditingNote(null)}>
              Cancelar
            </Button>
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
          <p className="text-muted-foreground text-sm my-2">
            ¿Seguro que quieres eliminar esta tarjeta? Se perderá todo su historial de repasos.
          </p>
          <DialogFooter className="mt-4 flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setDeletingNoteId(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" className="flex-1" onClick={confirmDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
