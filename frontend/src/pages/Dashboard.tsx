import toast from 'react-hot-toast';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import DeckSheet, { DeckSheetsLoading } from '../components/DeckSheet';
import { CountsNotice, pendingCards } from '../components/StudyCounts';
import StudySummary from '../components/StudySummary';

import {
  useDecks,
  useDeckStats,
  useCreateDeck,
  useDeleteDeck,
  useUpdateDeck,
} from '../hooks/useDecks';
import BottomSheet from '../components/BottomSheet';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { Play, Plus, Search, MoreVertical, Trash2, Edit3 } from 'lucide-react';

export default function Dashboard() {
  const {
    data: decks = [],
    isLoading: loadingDecks,
    isError: isErrorDecks,
    refetch: retryDecks,
  } = useDecks();
  const {
    data: deckCounts = {},
    isLoading: loadingStats,
    isError: errorStats,
    refetch: retryStats,
  } = useDeckStats(decks.map((d) => d.id));

  const createMutation = useCreateDeck();
  const deleteMutation = useDeleteDeck();
  const updateMutation = useUpdateDeck();

  const [deleteModalDeck, setDeleteModalDeck] = useState<{ id: string; name: string } | null>(null);
  const [activeMoreMenu, setActiveMoreMenu] = useState<string | null>(null);
  const [editModalDeck, setEditModalDeck] = useState<{ id: string; name: string } | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [modalInputValue, setModalInputValue] = useState('');

  const confirmDelete = async () => {
    if (!deleteModalDeck) return;
    try {
      await deleteMutation.mutateAsync(deleteModalDeck.id);
      toast.success('Mazo eliminado');
    } catch {
      toast.error('Error al eliminar mazo');
    } finally {
      setDeleteModalDeck(null);
    }
  };

  const confirmEdit = async () => {
    if (
      !editModalDeck ||
      !modalInputValue.trim() ||
      modalInputValue.trim() === editModalDeck.name
    ) {
      setEditModalDeck(null);
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: editModalDeck.id,
        data: { name: modalInputValue.trim() },
      });
      toast.success('Nombre actualizado');
    } catch {
      toast.error('Error al actualizar');
    } finally {
      setEditModalDeck(null);
    }
  };

  const confirmCreate = async () => {
    if (!modalInputValue.trim()) {
      setCreateModalOpen(false);
      return;
    }
    try {
      await createMutation.mutateAsync({ name: modalInputValue.trim() });
      toast.success('Mazo creado');
    } catch {
      toast.error('Error al crear mazo');
    } finally {
      setCreateModalOpen(false);
      setModalInputValue('');
    }
  };

  return (
    <div className="fade-in study-canvas-page">
      <header className="canvas-heading">
        <div>
          <h1>Mis mazos</h1>
        </div>
        <Button
          className="canvas-create"
          aria-label="Crear un mazo"
          onClick={() => {
            setModalInputValue('');
            setCreateModalOpen(true);
          }}
        >
          <Plus size={18} aria-hidden="true" />{' '}
          <span className="create-label-wide">Nuevo mazo</span>
          <span className="create-label-narrow">Nuevo</span>
        </Button>
      </header>

      {isErrorDecks ? (
        <div className="paper-sheet sheet-empty" role="alert">
          <h2>Error cargando mazos.</h2>
          <p>No se ha podido abrir tu colección.</p>
          <button className="sheet-action" onClick={() => void retryDecks()}>
            Reintentar
          </button>
        </div>
      ) : loadingDecks ? (
        <DeckSheetsLoading />
      ) : (
        <>
          <CountsNotice
            loading={loadingStats}
            error={errorStats}
            onRetry={() => void retryStats()}
          />
          {decks.length > 0 && !loadingStats && !errorStats && (
            <StudySummary
              stats={decks.flatMap((deck) => (deckCounts[deck.id] ? [deckCounts[deck.id]] : []))}
            />
          )}
          <div className="canvas-section-heading">
            <h2>Tus mazos</h2>
            <span>
              {decks.length} {decks.length === 1 ? 'mazo' : 'mazos'}
            </span>
          </div>
          <div className="deck-grid">
            {decks.map((deck) => {
              const counts = !errorStats ? deckCounts[deck.id] : undefined;
              const due = counts && pendingCards(counts);
              return (
                <DeckSheet
                  key={deck.id}
                  deck={deck}
                  stats={counts}
                  menu={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Opciones del mazo ${deck.name}`}
                      onClick={() => setActiveMoreMenu(deck.id)}
                    >
                      <MoreVertical size={20} aria-hidden="true" />
                    </Button>
                  }
                >
                  {counts && counts.totalCount === 0 ? (
                    <Link className="sheet-action sheet-action--primary" to={`/add/${deck.id}`}>
                      <Plus size={18} aria-hidden="true" /> Añadir tarjetas
                    </Link>
                  ) : (
                    <Link
                      className="sheet-action sheet-action--primary"
                      to={due ? `/study/${deck.id}` : `/hub/${deck.id}`}
                    >
                      <Play size={16} aria-hidden="true" />{' '}
                      {due ? `Repasar (${due.toLocaleString('es-ES')})` : 'Abrir mazo'}
                    </Link>
                  )}
                  {counts?.totalCount !== 0 && (
                    <Link
                      className="sheet-action sheet-action--icon"
                      aria-label={`Añadir tarjeta a ${deck.name}`}
                      to={`/add/${deck.id}`}
                    >
                      <Plus size={20} aria-hidden="true" />
                    </Link>
                  )}
                  <Link
                    className="sheet-action sheet-action--icon"
                    aria-label={`Explorar tarjetas de ${deck.name}`}
                    to={`/browser?deck=${deck.id}`}
                  >
                    <Search size={19} aria-hidden="true" />
                  </Link>
                </DeckSheet>
              );
            })}
            {decks.length === 0 && (
              <div className="paper-sheet sheet-empty">
                <h2>Crea tu primer mazo</h2>
                <p>Reúne las tarjetas de una materia o empieza con una plantilla.</p>
                <Link className="sheet-action" to="/templates">
                  Ver plantillas
                </Link>
              </div>
            )}
          </div>
        </>
      )}
      {decks.map((deck) => (
        <BottomSheet
          key={deck.id}
          isOpen={activeMoreMenu === deck.id}
          onClose={() => setActiveMoreMenu(null)}
          title="Opciones de Mazo"
        >
          <div className="bottom-sheet-grid">
            <button
              className="bottom-sheet-item"
              onClick={() => {
                setActiveMoreMenu(null);
                setModalInputValue(deck.name);
                setEditModalDeck(deck);
              }}
            >
              <Edit3 className="bottom-sheet-item-icon" />
              <span>Editar nombre</span>
            </button>
            <button
              className="bottom-sheet-item text-destructive"
              onClick={() => {
                setActiveMoreMenu(null);
                setDeleteModalDeck(deck);
              }}
            >
              <Trash2 className="bottom-sheet-item-icon bg-destructive/10 text-destructive" />
              <span>Eliminar mazo</span>
            </button>
          </div>
        </BottomSheet>
      ))}

      <Dialog open={!!deleteModalDeck} onOpenChange={(open) => !open && setDeleteModalDeck(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Mazo</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm my-2">
            ¿Seguro que quieres eliminar el mazo "{deleteModalDeck?.name}" y todas sus tarjetas?
          </p>
          <DialogFooter className="mt-4 flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteModalDeck(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" className="flex-1" onClick={confirmDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editModalDeck} onOpenChange={(open) => !open && setEditModalDeck(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renombrar Mazo</DialogTitle>
          </DialogHeader>
          <div className="my-4">
            <input
              aria-label="Nombre del mazo"
              className="form-input w-full"
              value={modalInputValue}
              onChange={(e) => setModalInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmEdit()}
            />
          </div>
          <DialogFooter className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setEditModalDeck(null)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={confirmEdit}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Mazo</DialogTitle>
          </DialogHeader>
          <div className="my-4">
            <input
              aria-label="Nombre del mazo"
              className="form-input w-full"
              value={modalInputValue}
              onChange={(e) => setModalInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmCreate()}
              placeholder="Nombre del mazo..."
            />
          </div>
          <DialogFooter className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setCreateModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button className="flex-1" onClick={confirmCreate}>
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
