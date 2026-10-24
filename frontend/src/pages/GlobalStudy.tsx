import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDecks, useDeckStats } from '../hooks/useDecks';
import { Skeleton } from '../components/ui/skeleton';

export default function GlobalStudy() {
  const navigate = useNavigate();
  const { data: decks = [], isLoading: loadingDecks } = useDecks();
  const deckIds = useMemo(() => decks.map(d => d.id), [decks]);
  const { data: deckStats = {} } = useDeckStats(deckIds);

  if (loadingDecks) {
    return (
      <div className="fade-in pb-10">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
              <Skeleton className="h-6 w-48 mb-4" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in pb-10">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {decks.map(deck => {
          const stats = deckStats[deck.id];
          const counts = {
            new: stats?.newCount ?? 0,
            learning: stats?.learningCount ?? 0,
            review: stats?.reviewCount ?? 0,
            total: stats?.totalCount ?? 0
          };

          return (
            <div
              key={deck.id}
              className="card"
              role="button"
              tabIndex={0}
              aria-label={`Entrar al Hub del mazo ${deck.name}`}
              onClick={() => navigate(`/hub/${deck.id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/hub/${deck.id}`); } }}
              style={{ cursor: 'pointer', overflow: 'hidden', padding: 0, marginBottom: '1rem', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <h3 className="card-title" style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>{deck.name}</h3>
                
                <div style={{ display: 'flex', background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '0.75rem', marginTop: '0.5rem' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '1.1rem' }}>{counts.new}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, marginTop: '0.25rem', textTransform: 'uppercase' }}>Nuevas</span>
                  </div>
                  <div style={{ width: '1px', background: 'var(--border-subtle)', margin: '0 0.5rem' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: '1.1rem' }}>{counts.learning}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, marginTop: '0.25rem', textTransform: 'uppercase' }}>Aprend.</span>
                  </div>
                  <div style={{ width: '1px', background: 'var(--border-subtle)', margin: '0 0.5rem' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ color: '#10B981', fontWeight: 700, fontSize: '1.1rem' }}>{counts.review}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, marginTop: '0.25rem', textTransform: 'uppercase' }}>Revisión</span>
                  </div>
                  <div style={{ width: '1px', background: 'var(--border-subtle)', margin: '0 0.5rem' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.1rem' }}>{counts.total}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, marginTop: '0.25rem', textTransform: 'uppercase' }}>Total</span>
                  </div>
                </div>
              </div>
              
              <div style={{ background: 'var(--bg-glass)', padding: '1rem', display: 'flex', justifyContent: 'center' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', borderRadius: '12px', padding: '0.875rem' }}
                  onClick={(e) => { e.stopPropagation(); navigate(`/hub/${deck.id}`); }}
                >
                  Entrar al Hub
                </button>
              </div>
            </div>
          );
        })}

        {decks.length === 0 && (
          <div className="card" style={{ textAlign: 'center', borderStyle: 'dashed' }}>
            <h3 className="card-title" style={{ margin: '0 0 0.5rem 0' }}>¡No tienes mazos aún!</h3>
            <p style={{ color: 'var(--text-muted)', margin: '0 0 1.5rem 0' }}>Ve a Mis Mazos para crear tu primer mazo de tarjetas.</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>Ir a Mis Mazos</button>
          </div>
        )}
      </div>
    </div>
  );
}
