import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { decksApi, notesApi, studyApi } from '../services/api';

export default function Stats() {
  const [stats, setStats] = useState({
    totalDecks: 0,
    totalNotes: 0,
    totalCards: 0,
    cardsByState: { new: 0, learning: 0, review: 0 },
    avgEase: 0,
    totalLapses: 0,
    mature: 0,
    suspended: 0
  });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadStats() {
      try {
        const decks = await decksApi.getAll();
        const allCards = [];
        let totalNotes = 0;
        
        for (const d of decks) {
          const notes = await notesApi.getByDeck(d.id);
          totalNotes += notes.length;
          const dueCards = await studyApi.getDueCards(d.id, 10000);
          allCards.push(...dueCards.map(c => c.card));
        }

        const cardsByState = { new: 0, learning: 0, review: 0 };
        let totalEase = 0;
        let easeCount = 0;
        let totalLapses = 0;
        let mature = 0;
        let suspended = 0;

        allCards.forEach(c => {
          if (c.state === 'new') cardsByState.new++;
          else if (c.state === 'learning' || c.state === 'relearning') cardsByState.learning++;
          else if (c.state === 'review') cardsByState.review++;
          
          if (c.easeFactor) {
            totalEase += c.easeFactor;
            easeCount++;
          }
          totalLapses += (c.lapses || 0);
          if (c.intervalDays >= 21) mature++;
          if (c.suspended) suspended++;
        });

        setStats({
          totalDecks: decks.length,
          totalNotes,
          totalCards: allCards.length,
          cardsByState,
          avgEase: easeCount > 0 ? totalEase / easeCount : 0,
          totalLapses,
          mature,
          suspended
        });
      } catch (e) {
        toast.error('Error al cargar estadísticas');
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="fade-in pb-10">
      {stats.totalCards === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>ðŸ“Š</div>
          <h3>Sin datos aún</h3>
          <p style={{ color: 'var(--text-muted)' }}>Añade tarjetas para ver tus estadísticas.</p>
        </div>
      ) : (
        <>
          <div className="kpi-grid" style={{ marginBottom: 24 }}>
            <div className="kpi-card" style={{ padding: '1rem', textAlign: 'center', background: 'var(--bg-card)', borderColor: 'rgba(255, 255, 255, 0.05)' }}>
              <div className="kpi-value" style={{ color: 'var(--accent-primary)' }}>{stats.totalDecks}</div>
              <div className="kpi-label">MAZOS</div>
            </div>
            <div className="kpi-card" style={{ padding: '1rem', textAlign: 'center', background: 'var(--bg-card)', borderColor: 'rgba(255, 255, 255, 0.05)' }}>
              <div className="kpi-value" style={{ color: 'var(--accent-primary)' }}>{stats.totalNotes}</div>
              <div className="kpi-label">NOTAS</div>
            </div>
            <div className="kpi-card" style={{ padding: '1rem', textAlign: 'center', background: 'var(--bg-card)', borderColor: 'rgba(255, 255, 255, 0.05)' }}>
              <div className="kpi-value" style={{ color: 'var(--accent-primary)' }}>{stats.totalCards}</div>
              <div className="kpi-label">TARJETAS</div>
            </div>
            <div className="kpi-card" style={{ padding: '1rem', textAlign: 'center', background: 'var(--bg-card)', borderColor: 'rgba(255, 255, 255, 0.05)' }}>
              <div className="kpi-value" style={{ color: 'var(--accent-primary)' }}>{(stats.avgEase * 100).toFixed(0)}%</div>
              <div className="kpi-label">EASE</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 className="card-title" style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Distribución</h3>
            <div style={{ display: 'flex', width: '100%', height: '24px', borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem' }}>
              <div style={{ width: `${(stats.cardsByState.new / Math.max(1, stats.totalCards)) * 100}%`, background: 'var(--accent-primary)' }} />
              <div style={{ width: `${(stats.cardsByState.learning / Math.max(1, stats.totalCards)) * 100}%`, background: 'var(--accent-primary-light)' }} />
              <div style={{ width: `${(stats.cardsByState.review / Math.max(1, stats.totalCards)) * 100}%`, background: 'var(--accent-primary-dark)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-primary)' }} />
                <span>Nuevas {((stats.cardsByState.new / Math.max(1, stats.totalCards)) * 100).toFixed(0)}%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-primary-light)' }} />
                <span>Aprender {((stats.cardsByState.learning / Math.max(1, stats.totalCards)) * 100).toFixed(0)}%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-primary-dark)' }} />
                <span>Revisión {((stats.cardsByState.review / Math.max(1, stats.totalCards)) * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          <div className="kpi-grid">
            <div className="kpi-card" style={{ padding: '1rem', textAlign: 'center', background: 'var(--bg-card)', borderColor: 'rgba(255, 255, 255, 0.05)' }}>
              <div className="kpi-value" style={{ color: 'var(--accent-primary)' }}>{stats.mature}</div>
              <div className="kpi-label">MADURAS</div>
            </div>
            <div className="kpi-card" style={{ padding: '1rem', textAlign: 'center', background: 'var(--bg-card)', borderColor: 'rgba(255, 255, 255, 0.05)' }}>
              <div className="kpi-value" style={{ color: 'var(--accent-primary)' }}>{stats.totalLapses}</div>
              <div className="kpi-label">LAPSOS</div>
            </div>
            <div className="kpi-card" style={{ padding: '1rem', textAlign: 'center', background: 'var(--bg-card)', borderColor: 'rgba(255, 255, 255, 0.05)' }}>
              <div className="kpi-value" style={{ color: 'var(--accent-primary)' }}>{stats.suspended}</div>
              <div className="kpi-label">SUSPENDIDAS</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}






