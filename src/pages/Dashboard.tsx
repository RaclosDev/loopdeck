import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { decksApi, studyApi } from '../services/api';
import { Deck } from '../types';

export default function Dashboard() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckCounts, setDeckCounts] = useState<Record<string, { new: number, learning: number, review: number, total: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { addToast } = useStore();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const ds = await decksApi.getAll();
      setDecks(ds);

      const counts: Record<string, { new: number, learning: number, review: number, total: number }> = {};
      for (const deck of ds) {
        const cards = await studyApi.getDueCards(deck.id, 10000);
        let n = 0, l = 0, r = 0;
        const now = new Date();
        cards.forEach(c => {
          if (c.card.state === 'new') n++;
          else if ((c.card.state === 'learning' || c.card.state === 'relearning') && new Date(c.card.due) <= now) l++;
          else if (c.card.state === 'review' && new Date(c.card.due) <= now) r++;
        });
        counts[deck.id] = { new: n, learning: l, review: r, total: cards.length };
      }
      setDeckCounts(counts);
    } catch (err) {
      setError('Error al cargar los mazos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const totalNew = Object.values(deckCounts).reduce((s, c) => s + c.new, 0);
  const totalLearning = Object.values(deckCounts).reduce((s, c) => s + c.learning, 0);
  const totalReview = Object.values(deckCounts).reduce((s, c) => s + c.review, 0);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Seguro que quieres eliminar el mazo "${name}" y todas sus tarjetas?`)) return;
    try {
      await decksApi.delete(id);
      setDecks(decks.filter(d => d.id !== id));
      addToast('Mazo eliminado', 'success');
    } catch (e) {
      addToast('Error al eliminar mazo', 'error');
    }
  };

  const handleEdit = async (id: string, currentName: string) => {
    const newName = window.prompt('Nuevo nombre del mazo:', currentName);
    if (!newName || newName.trim() === currentName) return;
    try {
      await decksApi.update(id, { name: newName.trim() });
      setDecks(decks.map(d => d.id === id ? { ...d, name: newName.trim() } : d));
      addToast('Nombre actualizado', 'success');
    } catch (e) {
      addToast('Error al actualizar', 'error');
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="fade-in pb-10">
      {decks.length > 0 && (totalNew + totalLearning + totalReview) > 0 && (
        <div className="bg-card border border-white/5 rounded-[20px] p-4 flex justify-between items-center shadow-lg shadow-black/20 mb-8 mx-auto w-full">
          <div className="flex flex-col items-center flex-1">
            <div className="text-blue-500 font-bold text-2xl leading-none mb-1.5">{totalNew}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Nuevas</div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="flex flex-col items-center flex-1">
            <div className="text-orange-500 font-bold text-2xl leading-none mb-1.5">{totalLearning}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Aprend.</div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="flex flex-col items-center flex-1">
            <div className="text-emerald-500 font-bold text-2xl leading-none mb-1.5">{totalReview}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Revisión</div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="flex flex-col items-center flex-1">
            <div className="text-foreground font-bold text-2xl leading-none mb-1.5">{totalNew + totalLearning + totalReview}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total</div>
          </div>
        </div>
      )}

      {error && <div style={{ color: 'var(--danger-color)', padding: 12, background: 'var(--danger-bg)', borderRadius: 12, marginBottom: 20 }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {decks.map(deck => {
          const counts = deckCounts[deck.id] || { new: 0, learning: 0, review: 0 };
          const totalDue = counts.new + counts.learning + counts.review;
          
          return (
            <div key={deck.id} className="card" style={{ overflow: 'hidden', padding: 0, marginBottom: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <h2 className="card-title" style={{ margin: 0, fontSize: '1.25rem' }}>{deck.name}</h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="icon-btn" style={{ padding: '6px', borderRadius: '50%' }} onClick={(e) => { e.stopPropagation(); handleEdit(deck.id, deck.name); }}>✏️</button>
                    <button className="icon-btn" style={{ padding: '6px', borderRadius: '50%', color: 'var(--danger-color)' }} onClick={(e) => { e.stopPropagation(); handleDelete(deck.id, deck.name); }}>🗑️</button>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-black/20 border border-white/5 rounded-xl px-2 sm:px-4 py-3 mt-2">
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-blue-500 font-bold text-lg leading-none">{counts.new}</span>
                    <span className="text-[9px] text-muted-foreground mt-1.5 uppercase font-bold tracking-wider">Nuevas</span>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-orange-500 font-bold text-lg leading-none">{counts.learning}</span>
                    <span className="text-[9px] text-muted-foreground mt-1.5 uppercase font-bold tracking-wider">Aprend.</span>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-emerald-500 font-bold text-lg leading-none">{counts.review}</span>
                    <span className="text-[9px] text-muted-foreground mt-1.5 uppercase font-bold tracking-wider">Revisión</span>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-foreground font-bold text-lg leading-none">{totalDue}</span>
                    <span className="text-[9px] text-muted-foreground mt-1.5 uppercase font-bold tracking-wider">Total</span>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-glass)', padding: '1rem', display: 'flex', gap: 12 }}>
                {totalDue > 0 ? (
                  <button className="btn btn-primary" style={{ flex: 1, padding: '0.75rem', borderRadius: 12 }} onClick={() => navigate(`/study/${deck.id}`)}>
                    Responder ({totalDue})
                  </button>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', fontWeight: 600 }}>
                    Al día ✅
                  </div>
                )}
                <button className="btn btn-primary" style={{ width: 44, height: 44, borderRadius: 12, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }} onClick={() => navigate(`/add/${deck.id}`)}>+</button>
                <button className="btn btn-secondary" style={{ width: 44, height: 44, borderRadius: 12, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => navigate(`/browser?deck=${deck.id}`)}>⚙️</button>
              </div>
            </div>
          );
        })}

        <div className="card" style={{ border: '2px dashed var(--border-medium)', background: 'var(--bg-card)', padding: 0 }}>
          <button 
            style={{ width: '100%', padding: '2rem', background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            onClick={async () => {
              const name = window.prompt('Nombre del nuevo mazo:');
              if (!name) return;
              try {
                const d = await decksApi.create({ name });
                setDecks([...decks, d]);
                addToast('Mazo creado', 'success');
              } catch (e) {
                addToast('Error', 'error');
              }
            }}
          >
            <div style={{ width: 48, height: 48, background: 'var(--bg-glass-strong)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>+</div>
            <div style={{ fontWeight: 600 }}>Nuevo Mazo</div>
          </button>
        </div>
      </div>
    </div>
  );
}







