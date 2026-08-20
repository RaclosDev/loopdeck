import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { decksApi, studyApi } from '../services/api';

function GlobalStudy() {
  const [decks, setDecks] = useState([]);
  const [deckCounts, setDeckCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { addToast } = useStore();

  const loadDecks = useCallback(async () => {
    try {
      const data = await decksApi.getAll();
      setDecks(data);
      // Load due counts for each deck in parallel
      const countResults = await Promise.allSettled(
        data.map(d => studyApi.getDueCards(d.id, 1000).then(cards => ({ id: d.id, cards })))
      );
      const counts = {};
      countResults.forEach(r => {
        if (r.status === 'fulfilled') {
          const { id, cards } = r.value;
          const now = new Date();
          counts[id] = {
            new: cards.filter(c => c.state === 'new').length,
            learning: cards.filter(c => (c.state === 'learning' || c.state === 'relearning') && new Date(c.due) <= now).length,
            review: cards.filter(c => c.state === 'review' && new Date(c.due) <= now).length,
            total: cards.length,
          };
        }
      });
      setDeckCounts(counts);
    } catch (e) {
      addToast('Error cargando mazos: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadDecks(); }, [loadDecks]);

  if (loading) {
    return (
      <div className="study-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', paddingBottom: '100px' }}>
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Centro de Estudio</h1>
          <p className="dashboard-subtitle">Selecciona un mazo para ver los modos de estudio disponibles.</p>
        </div>
      </header>

      <div className="deck-grid" style={{ marginTop: '2rem' }}>
        {decks.map(deck => {
          const counts = deckCounts[deck.id] || { new: 0, learning: 0, review: 0, total: 0 };
          const due = counts.learning + counts.review;
          const progress = counts.total > 0 ? ((counts.total - (due + counts.new)) / counts.total) * 100 : 0;

          return (
            <div key={deck.id} className="deck-card" onClick={() => navigate(`/hub/${deck.id}`)} style={{ cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
              
              <div className="deck-card-header">
                <h3 className="deck-card-title">{deck.name}</h3>
              </div>
              
              {deck.description && <p className="deck-card-desc" style={{ marginBottom: 'auto' }}>{deck.description}</p>}

              <div className="deck-card-stats" style={{ marginTop: '16px' }}>
                <div className="deck-count">
                  <span className="deck-count-number new">{counts.new}</span>
                  <span className="deck-count-label">Nuevas</span>
                </div>
                <div className="deck-count">
                  <span className="deck-count-number learning">{counts.learning}</span>
                  <span className="deck-count-label">Aprendiendo</span>
                </div>
                <div className="deck-count">
                  <span className="deck-count-number review">{counts.review}</span>
                  <span className="deck-count-label">Revisión</span>
                </div>
              </div>

              <div className="deck-card-progress" style={{ margin: '16px 0' }}>
                <div className="deck-card-progress-bar" style={{ width: `${progress}%` }} />
              </div>

              <button className="primary-btn" style={{ width: '100%' }}>
                🎯 Seleccionar Mazo
              </button>
            </div>
          );
        })}

        {decks.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-state-icon">🧠</div>
            <h3>¡No tienes mazos aún!</h3>
            <p>Ve a Mis Mazos para crear tu primer mazo de tarjetas.</p>
            <button className="primary-btn" onClick={() => navigate('/')}>
              Ir a Mis Mazos
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default GlobalStudy;
