import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { decksApi, studyApi } from '../services/api';
import { Deck } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
    const [decks, setDecks] = useState<Deck[]>([]);
  const [deckCounts, setDeckCounts] = useState<Record<string, {new: number, learning: number, review: number}>>({});
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
      const data = await decksApi.getAll();
      setDecks(data);
      const counts: Record<string, {new: number, learning: number, review: number}> = {};
      for (const d of data) {
        const dueCards = await studyApi.getDueCards(d.id, 10000);
        let n = 0, l = 0, r = 0;
        for (const c of dueCards) {
          if (c.card.state === 'new') n++;
          else if (c.card.state === 'learning' || c.card.state === 'relearning') l++;
          else if (c.card.state === 'review') r++;
        }
        counts[d.id] = { new: n, learning: l, review: r };
      }
      setDeckCounts(counts);
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
          <div className="kpi-card" style={{ padding: '0.75rem 0.5rem' }}>
            <div style={{ color: 'var(--accent-primary)', fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>{totalNew}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nuevas</div>
          </div>
          <div className="kpi-card" style={{ padding: '0.75rem 0.5rem' }}>
            <div style={{ color: '#F59E0B', fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>{totalLearning}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Aprend.</div>
          </div>
          <div className="kpi-card" style={{ padding: '0.75rem 0.5rem' }}>
            <div style={{ color: '#10B981', fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>{totalReview}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Revisión</div>
          </div>
          <div className="kpi-card" style={{ padding: '0.75rem 0.5rem' }}>
            <div style={{ color: 'var(--text-primary)', fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>{totalNew + totalLearning + totalReview}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</div>
          </div>
        </div>
      )}

      {error && <div style={{ color: 'var(--color-danger)', padding: 12, background: 'var(--danger-bg)', borderRadius: 12, marginBottom: 20 }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {decks.map(deck => {
          const counts = deckCounts[deck.id] || { new: 0, learning: 0, review: 0 };
          const totalDue = counts.new + counts.learning + counts.review;
          
          return (
            <div key={deck.id} className="card" style={{ overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <h2 className="card-title" style={{ margin: 0, fontSize: '1.25rem' }}>{deck.name}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="icon-btn" style={{ opacity: 0.7 }} onClick={(e) => { e.stopPropagation(); setActiveMoreMenu(deck.id); }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                      </button>
                    </div>
                  </div>
                  
                  {activeMoreMenu === deck.id && (
                    <div className="bottom-sheet-overlay" onClick={(e) => { e.stopPropagation(); setActiveMoreMenu(null); }}>
                      <div className="bottom-sheet-content" onClick={e => e.stopPropagation()}>
                        <div className="bottom-sheet-drag-handle" />
                        <h3 className="bottom-sheet-title">Opciones de Mazo</h3>
                        <button className="bottom-sheet-item" onClick={(e) => { e.stopPropagation(); setActiveMoreMenu(null); setModalInputValue(deck.name); setEditModalDeck(deck); }}>
                          <span>Editar nombre</span>
                        </button>
                        <button className="bottom-sheet-item" style={{ color: 'var(--color-danger)' }} onClick={(e) => { e.stopPropagation(); setActiveMoreMenu(null); setDeleteModalDeck(deck); }}>
                          <span>Eliminar mazo</span>
                        </button>
                      </div>
                    </div>
                  )}

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
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.1rem' }}>{totalDue}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, marginTop: '0.25rem', textTransform: 'uppercase' }}>Total</span>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-glass)', padding: '1rem', display: 'flex', gap: '0.75rem' }}>
                {totalDue > 0 ? (
                  <button className="btn btn-primary" style={{ flex: 1, padding: '0.75rem', borderRadius: '12px' }} onClick={() => navigate(`/study/${deck.id}`)}>
                    Responder ({totalDue})
                  </button>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', fontWeight: 600 }}>
                    Al día ✨
                  </div>
                )}
                <button className="btn btn-primary" style={{ width: '44px', height: '44px', borderRadius: '12px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }} onClick={() => navigate(`/add/${deck.id}`)}>+</button>
                <button className="btn btn-secondary" style={{ width: '44px', height: '44px', borderRadius: '12px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => navigate(`/browser?deck=${deck.id}`)}>🔍</button>
              </div>
            </div>
          );
        })}

        <div className="card" style={{ border: '2px dashed var(--border-medium)', background: 'var(--bg-card)', padding: 0 }}>
          <button 
            style={{ width: '100%', padding: '2rem', background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
            onClick={() => { setModalInputValue(''); setCreateModalOpen(true); }}
          >
            <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: 'var(--text-secondary)' }}>+</div>
            <div style={{ fontWeight: 600 }}>Nuevo Mazo</div>
          </button>
        </div>
      </div>

      {deleteModalDeck && (
        <div className="ds-overlay">
          <div className="ds-modal-content" style={{ width: "100%", maxWidth: "340px", padding: "1.5rem", borderRadius: "var(--radius-xl)" }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Eliminar Mazo</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>¿Seguro que quieres eliminar el mazo "{deleteModalDeck.name}" y todas sus tarjetas?</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteModalDeck(null)}>Cancelar</button>
              <button className="btn btn-danger" style={{ flex: 1, background: '#EF4444', color: 'white', border: 'none' }} onClick={confirmDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {editModalDeck && (
        <div className="ds-overlay">
          <div className="ds-modal-content" style={{ width: "100%", maxWidth: "340px", padding: "1.5rem", borderRadius: "var(--radius-xl)" }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Renombrar Mazo</h3>
            <input className="form-input" style={{ width: '100%', marginBottom: '1.5rem' }} autoFocus value={modalInputValue} onChange={e => setModalInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmEdit()} />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditModalDeck(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={confirmEdit}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {createModalOpen && (
        <div className="ds-overlay">
          <div className="ds-modal-content" style={{ width: "100%", maxWidth: "340px", padding: "1.5rem", borderRadius: "var(--radius-xl)" }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Nuevo Mazo</h3>
            <input className="form-input" style={{ width: '100%', marginBottom: '1.5rem' }} autoFocus value={modalInputValue} onChange={e => setModalInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmCreate()} placeholder="Nombre del mazo..." />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setCreateModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={confirmCreate}>Crear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
