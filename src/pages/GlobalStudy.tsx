import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { decksApi, studyApi } from '../services/api';
import { Deck, DueCardDto } from '../types';

export default function GlobalStudy() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckCounts, setDeckCounts] = useState<Record<string, { new: number, learning: number, review: number, total: number }>>({});
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

          return (
            <div key={deck.id} className="card" onClick={() => navigate(`/hub/${deck.id}`)} style={{ cursor: 'pointer', overflow: 'hidden', padding: 0, marginBottom: '1rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <h3 className="card-title" style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>{deck.name}</h3>
                
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
                    <span className="text-foreground font-bold text-lg leading-none">{counts.total}</span>
                    <span className="text-[9px] text-muted-foreground mt-1.5 uppercase font-bold tracking-wider">Total</span>
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





