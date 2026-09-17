import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { decksApi, studyApi } from '../services/api';

export default function Dashboard() {
  const [decks, setDecks] = useState([]);
  const [deckCounts, setDeckCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { addToast } = useStore();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const ds = await decksApi.getAll();
      setDecks(ds);

      const counts = {};
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

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Seguro que quieres eliminar el mazo "${name}" y todas sus tarjetas?`)) return;
    try {
      await decksApi.delete(id);
      setDecks(decks.filter(d => d.id !== id));
      addToast('Mazo eliminado', 'success');
    } catch (e) {
      addToast('Error al eliminar mazo', 'error');
    }
  };

  const handleEdit = async (id, currentName) => {
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
        <div className="kpi-grid" style={{ marginBottom: 28 }}>
          <div className="kpi-card accent" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="kpi-value accent">{totalNew}</div>
            <div className="kpi-label" style={{ marginTop: 4 }}>NUEVAS</div>
          </div>
          <div className="kpi-card info" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="kpi-value info" style={{ color: 'var(--srs-learning)' }}>{totalLearning}</div>
            <div className="kpi-label" style={{ marginTop: 4 }}>APRENDIENDO</div>
          </div>
          <div className="kpi-card info" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="kpi-value info" style={{ color: 'var(--srs-review)' }}>{totalReview}</div>
            <div className="kpi-label" style={{ marginTop: 4 }}>REVISIÓN</div>
          </div>
          <div className="kpi-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="kpi-value">{totalNew + totalLearning + totalReview}</div>
            <div className="kpi-label" style={{ marginTop: 4 }}>TOTAL</div>
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

                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1, background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '10px', borderRadius: 12, textAlign: 'center' }}>
                    <div style={{ color: '#3b82f6', fontWeight: 700, fontSize: '1.2rem' }}>{counts.new}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>NUEVAS</div>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '10px', borderRadius: 12, textAlign: 'center' }}>
                    <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: '1.2rem' }}>{counts.learning}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>APRENDER</div>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '10px', borderRadius: 12, textAlign: 'center' }}>
                    <div style={{ color: '#10b981', fontWeight: 700, fontSize: '1.2rem' }}>{counts.review}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>REVISIÓN</div>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-glass)', padding: '1rem', display: 'flex', gap: 12 }}>
                {totalDue > 0 ? (
                  <button className="btn btn-primary" style={{ flex: 1, padding: '0.75rem', borderRadius: 12 }} onClick={() => navigate(`/study/${deck.id}`)}>
                    Responder ({totalDue})
                  </button>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--srs-review)', fontWeight: 600 }}>
                    Al día ✅
                  </div>
                )}
                <button className="btn btn-primary" style={{ width: 44, height: 44, borderRadius: 12, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }} onClick={() => navigate(`/add/${deck.id}`)}>+</button>
                <button className="btn btn-secondary" style={{ width: 44, height: 44, borderRadius: 12, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => navigate(`/browser?deck=${deck.id}`)}>⚙️</button>
              </div>
            </div>
          );
        })}

        <div className="card" style={{ border: '2px dashed var(--border-medium)', background: 'transparent', padding: 0 }}>
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



