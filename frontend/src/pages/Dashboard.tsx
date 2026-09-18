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
            <div key={deck.id} className="card" style={{ overflow: 'hidden', padding: 0, marginBottom: '1rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex justify-between items-start" style={{ marginBottom: '1rem' }}>
                  <h3 className="card-title" style={{ margin: '0', fontSize: '1.25rem', cursor: 'pointer' }} onClick={() => navigate(`/study/${deck.id}`)}>{deck.name}</h3>
                  <Button variant="ghost" size="icon" onClick={() => setActiveMoreMenu(deck.id)} style={{ marginTop: '-4px', marginRight: '-8px' }}>
                    <MoreVertical className="w-5 h-5 opacity-70" />
                  </Button>
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

                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.75rem', marginTop: '0.5rem' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '1.1rem' }}>{counts.new}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, marginTop: '0.25rem', textTransform: 'uppercase' }}>Nuevas</span>
                  </div>
                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 0.5rem' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: '1.1rem' }}>{counts.learning}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, marginTop: '0.25rem', textTransform: 'uppercase' }}>Aprend.</span>
                  </div>
                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 0.5rem' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ color: '#10B981', fontWeight: 700, fontSize: '1.1rem' }}>{counts.review}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, marginTop: '0.25rem', textTransform: 'uppercase' }}>Revisión</span>
                  </div>
                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 0.5rem' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.1rem' }}>{totalCards}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, marginTop: '0.25rem', textTransform: 'uppercase' }}>Total</span>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-glass)', padding: '1rem', display: 'flex', gap: '0.75rem' }}>
                {totalDue > 0 ? (
                  <Button style={{ flex: 1, borderRadius: '12px', padding: '0.875rem', fontWeight: 700 }} className="btn-primary" onClick={() => navigate(`/study/${deck.id}`)}>
                    <Play className="w-5 h-5 mr-2" fill="currentColor" /> Responder ({totalDue})
                  </Button>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                    Al día 🌟
                  </div>
                )}
                <Button style={{ width: '48px', height: 'auto', borderRadius: '12px' }} onClick={() => navigate(`/add/${deck.id}`)}>
                  <Plus className="w-5 h-5" />
                </Button>
                <Button variant="secondary" style={{ width: '48px', height: 'auto', borderRadius: '12px' }} onClick={() => navigate(`/browser?deck=${deck.id}`)}>
                  <Search className="w-5 h-5" />
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