import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { decksApi, studyApi } from '../services/api';
import { Deck } from '../types';
import BottomSheet from '../components/BottomSheet';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Play, Plus, Search, MoreVertical, Trash2, Edit3, FolderPlus } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckCounts, setDeckCounts] = useState<Record<string, {new: number, learning: number, review: number, totalCount: number}>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteModalDeck, setDeleteModalDeck] = useState<{ id: string, name: string } | null>(null);
  const [activeMoreMenu, setActiveMoreMenu] = useState<string | null>(null);
  const [editModalDeck, setEditModalDeck] = useState<{ id: string, name: string } | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [modalInputValue, setModalInputValue] = useState('');

  useEffect(() => {
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await decksApi.getAll();
      if (!Array.isArray(data)) {
         setDecks([]);
         return;
      }
      setDecks(data);
      
      try {
        const stats = await decksApi.getStats();
        const mappedCounts: Record<string, {new: number, learning: number, review: number, totalCount: number}> = {};
        
        for (const d of data) {
          if (stats && stats[d.id]) {
            mappedCounts[d.id] = {
              new: stats[d.id].newCount || 0,
              learning: stats[d.id].learningCount || 0,
              review: stats[d.id].reviewCount || 0,
              totalCount: stats[d.id].totalCount || 0
            };
          } else {
            mappedCounts[d.id] = { new: 0, learning: 0, review: 0, totalCount: 0 };
          }
        }
        setDeckCounts(mappedCounts);
      } catch (err) {
        console.error("Error cargando stats globales", err);
      }
    } catch (e) {
      setError('Error al cargar mazos');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteModalDeck) return;
    try {
      await decksApi.delete(deleteModalDeck.id);
      setDecks(decks.filter(d => d.id !== deleteModalDeck.id));
      toast.success('Mazo eliminado');
    } catch (e) {
      toast.error('Error al eliminar mazo');
    } finally {
      setDeleteModalDeck(null);
    }
  };

  const confirmEdit = async () => {
    if (!editModalDeck || !modalInputValue.trim() || modalInputValue.trim() === editModalDeck.name) {
      setEditModalDeck(null);
      return;
    }
    try {
      await decksApi.update(editModalDeck.id, { name: modalInputValue.trim() });
      setDecks(decks.map(d => d.id === editModalDeck.id ? { ...d, name: modalInputValue.trim() } : d));
      toast.success('Nombre actualizado');
    } catch (e) {
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
      const d = await decksApi.create({ name: modalInputValue.trim() });
      setDecks([...decks, d]);
      toast.success('Mazo creado');
    } catch (e) {
      toast.error('Error al crear mazo');
    } finally {
      setCreateModalOpen(false);
      setModalInputValue('');
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  let totalNew = 0, totalLearning = 0, totalReview = 0;
  Object.values(deckCounts).forEach(c => {
    totalNew += c.new;
    totalLearning += c.learning;
    totalReview += c.review;
  });

  return (
    <div className="fade-in pb-12">
      {decks.length > 0 && (totalNew + totalLearning + totalReview) > 0 && (
        <div className="kpi-grid" style={{ marginBottom: '2rem' }}>
          <div className="kpi-card accent">
            <div className="kpi-label">NUEVAS</div>
            <div className="kpi-value accent">{totalNew}</div>
          </div>
          <div className="kpi-card warning" style={{ borderColor: 'rgba(245, 158, 11, 0.3)' }}>
            <div className="kpi-label" style={{ color: '#F59E0B' }}>APRENDIENDO</div>
            <div className="kpi-value" style={{ color: '#F59E0B' }}>{totalLearning}</div>
          </div>
          <div className="kpi-card success">
            <div className="kpi-label">REVISIÓN</div>
            <div className="kpi-value success">{totalReview}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">TOTAL</div>
            <div className="kpi-value">{totalNew + totalLearning + totalReview}</div>
          </div>
        </div>
      )}

      {error && <div className="kpi-badge negative" style={{ marginBottom: 20 }}>{error}</div>}

      <div className="flex flex-col gap-6">
        {decks.map(deck => {
          const counts = deckCounts[deck.id] || { new: 0, learning: 0, review: 0, totalCount: 0 };
          const totalDue = counts.new + counts.learning + counts.review;
          const totalCards = counts.totalCount || 0;
          
          return (
            <div key={deck.id} className="card overflow-hidden p-0 flex flex-col">
              <div className="p-6 border-b border-[var(--border-subtle)]">
                <div className="mb-4">
                  <h2 className="text-[1.1rem] font-bold m-0 text-white">{deck.name}</h2>
                </div>
                
                <BottomSheet
                  isOpen={activeMoreMenu === deck.id}
                  onClose={() => setActiveMoreMenu(null)}
                  title="Opciones de Mazo"
                >
                  <div className="bottom-sheet-grid">
                    <button className="bottom-sheet-item" onClick={(e) => { e.stopPropagation(); setActiveMoreMenu(null); setModalInputValue(deck.name); setEditModalDeck(deck); }}>
                      <Edit3 className="bottom-sheet-item-icon" />
                      <span>Editar nombre</span>
                    </button>
                    <button className="bottom-sheet-item text-destructive" onClick={(e) => { e.stopPropagation(); setActiveMoreMenu(null); setDeleteModalDeck(deck); }}>
                      <Trash2 className="bottom-sheet-item-icon bg-destructive/10 text-destructive" />
                      <span>Eliminar mazo</span>
                    </button>
                  </div>
                </BottomSheet>

                <div className="flex bg-black/20 border border-white/5 rounded-xl p-3 mt-2">
                  <div className="flex-1 flex flex-col items-center">
                    <span className="text-[var(--accent-primary)] font-bold text-lg">{counts.new}</span>
                    <span className="text-muted-foreground text-[0.7rem] font-semibold mt-1 uppercase">Nuevas</span>
                  </div>
                  <div className="w-[1px] bg-white/10 mx-2" />
                  <div className="flex-1 flex flex-col items-center">
                    <span className="text-[#F59E0B] font-bold text-lg">{counts.learning}</span>
                    <span className="text-muted-foreground text-[0.7rem] font-semibold mt-1 uppercase">Aprend.</span>
                  </div>
                  <div className="w-[1px] bg-white/10 mx-2" />
                  <div className="flex-1 flex flex-col items-center">
                    <span className="text-[#10B981] font-bold text-lg">{counts.review}</span>
                    <span className="text-muted-foreground text-[0.7rem] font-semibold mt-1 uppercase">Revisión</span>
                  </div>
                  <div className="w-[1px] bg-white/10 mx-2" />
                  <div className="flex-1 flex flex-col items-center">
                    <span className="text-foreground font-bold text-lg">{totalCards}</span>
                    <span className="text-muted-foreground text-[0.7rem] font-semibold mt-1 uppercase">Total</span>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--bg-glass)] p-3 flex">
                <Button className="flex-1 py-5 text-sm font-bold rounded-lg bg-[var(--accent-primary)] hover:brightness-110 text-white" onClick={(e) => { e.stopPropagation(); navigate(`/hub/${deck.id}`); }}>
                  Entrar al Hub
                </Button>
              </div>
            </div>
          );
        })}

        <div className="card border-2 border-dashed border-[var(--border-medium)] bg-[var(--bg-card)] p-0 hover:border-[var(--accent-primary)] hover:bg-[var(--bg-card-hover)] transition-all">
          <button 
            className="w-full p-8 bg-transparent border-none flex flex-col items-center gap-3 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => { setModalInputValue(''); setCreateModalOpen(true); }}
          >
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-foreground">
              <FolderPlus className="w-6 h-6" />
            </div>
            <div className="font-semibold text-lg">Nuevo Mazo</div>
          </button>
        </div>
      </div>

      <Dialog open={!!deleteModalDeck} onOpenChange={(open) => !open && setDeleteModalDeck(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Mazo</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm my-2">¿Seguro que quieres eliminar el mazo "{deleteModalDeck?.name}" y todas sus tarjetas?</p>
          <DialogFooter className="mt-4 flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteModalDeck(null)}>Cancelar</Button>
            <Button variant="destructive" className="flex-1" onClick={confirmDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editModalDeck} onOpenChange={(open) => !open && setEditModalDeck(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renombrar Mazo</DialogTitle>
          </DialogHeader>
          <div className="my-4">
            <input className="form-input w-full" autoFocus value={modalInputValue} onChange={e => setModalInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmEdit()} />
          </div>
          <DialogFooter className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setEditModalDeck(null)}>Cancelar</Button>
            <Button className="flex-1" onClick={confirmEdit}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Mazo</DialogTitle>
          </DialogHeader>
          <div className="my-4">
            <input className="form-input w-full" autoFocus value={modalInputValue} onChange={e => setModalInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmCreate()} placeholder="Nombre del mazo..." />
          </div>
          <DialogFooter className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setCreateModalOpen(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={confirmCreate}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}