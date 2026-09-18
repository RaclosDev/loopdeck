import toast from 'react-hot-toast';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { decksApi, studyApi } from '../services/api';
import { Deck, DueCardDto } from '../types';

export default function GlobalStudy() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckCounts, setDeckCounts] = useState<Record<string, { new: number, learning: number, review: number, total: number }>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  const loadDecks = useCallback(async () => {
    try {
      const data = await decksApi.getAll();
      setDecks(data);
      const countResults = await Promise.allSettled(
        data.map(d => studyApi.getDueCards(d.id, 1000).then(cards => ({ id: d.id, cards })))
      );

      const counts: Record<string, { new: number, learning: number, review: number, total: number }> = {};
      countResults.forEach(res => {
        if (res.status === 'fulfilled') {
          const { id, cards } = res.value as { id: string, cards: DueCardDto[] };
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
      toast.error('Error al cargar mazos');
    } finally {
      setLoading(false);
    }
  }, []);

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

          return (
            <div key={deck.id} className="card" onClick={() => navigate(`/hub/${deck.id}`)} style={{ cursor: 'pointer', overflow: 'hidden', padding: 0, marginBottom: '1rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <h3 className="card-title" style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>{deck.name}</h3>
                
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
                      <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.1rem' }}>{counts.total}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, marginTop: '0.25rem', textTransform: 'uppercase' }}>Total</span>
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
          <div className="card" style={{ textAlign: 'center', borderStyle: 'dashed' }}>
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





