import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { decksApi, studyApi } from '../services/api';

export default function GlobalStudy() {
  const [decks, setDecks] = useState([]);
  const [deckCounts, setDeckCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { addToast } = useStore();

  const loadDecks = useCallback(async () => {
    try {
      const data = await decksApi.getAll();
      setDecks(data);
      const countResults = await Promise.allSettled(
        data.map(d => studyApi.getDueCards(d.id, 1000).then(cards => ({ id: d.id, cards })))
      );

      const counts = {};
      countResults.forEach(res => {
        if (res.status === 'fulfilled') {
          const { id, cards } = res.value;
          let n = 0, l = 0, r = 0;
          cards.forEach(c => {
            if (c.card.state === 'new') n++;
            else if (c.card.state === 'review') r++;
            else l++;
          });
          counts[id] = { new: n, learning: l, review: r, total: cards.length };
        }
      });
      setDeckCounts(counts);
    } catch (e) {
      addToast('Error al cargar mazos', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadDecks(); }, [loadDecks]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="fade-in pb-10">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {decks.map(deck => {
          const counts = deckCounts[deck.id] || { new: 0, learning: 0, review: 0, total: 0 };
          const progress = counts.total === 0 ? 100 : Math.max(5, ((counts.total - (counts.new + counts.learning + counts.review)) / counts.total) * 100);

          return (
            <div key={deck.id} className="card" onClick={() => navigate(`/hub/${deck.id}`)} style={{ cursor: 'pointer', overflow: 'hidden', padding: 0, marginBottom: '1rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <h3 className="card-title" style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>{deck.name}</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div style={{ background: 'var(--accent-glow)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '1.25rem' }}>{counts.new}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>NUEVAS</div>
                  </div>
                  <div style={{ background: 'var(--accent-glow)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '1.25rem' }}>{counts.learning}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>APRENDIENDO</div>
                  </div>
                  <div style={{ background: 'var(--accent-glow)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '1.25rem' }}>{counts.review}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>REVISIÓN</div>
                  </div>
                  <div style={{ background: 'var(--accent-glow)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '1.25rem' }}>{counts.total}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>TOTAL</div>
                  </div>
                </div>
              </div>
              
              <div style={{ background: 'var(--bg-glass)', padding: '1rem', display: 'flex', justifyContent: 'center' }}>
                <button className="btn btn-primary" style={{ width: '100%', borderRadius: '12px', padding: '0.875rem' }}>
                   ➔ Entrar al Hub
                </button>
              </div>
            </div>
          );
        })}

        {decks.length === 0 && (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', borderStyle: 'dashed' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📭</div>
            <h3 className="card-title" style={{ margin: '0 0 0.5rem 0' }}>¡No tienes mazos aún!</h3>
            <p style={{ color: 'var(--text-muted)', margin: '0 0 1.5rem 0' }}>Ve a Mis Mazos para crear tu primer mazo de tarjetas.</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>Ir a Mis Mazos</button>
          </div>
        )}
      </div>
    </div>
  );
}

