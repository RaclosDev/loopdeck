import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FlashCard from '../components/FlashCard';
import useStore from '../store/useStore';
import { studyApi, decksApi } from '../services/api';

const RATING_COLORS = {
  1: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  2: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
  3: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
  4: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' }
};

const RATING_LABELS = { 1: 'Otra vez', 2: 'Difícil', 3: 'Bien', 4: 'Fácil' };

function RatingButtons({ intervals, onRate }) {
  if (!intervals) return null;
  return (
    <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '1rem' }}>
      {[1, 2, 3, 4].map(rating => (
        <button
          key={rating}
          className="icon-btn"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '12px 4px',
            border: `1px solid ${RATING_COLORS[rating].bg}`,
            color: RATING_COLORS[rating].color,
            borderRadius: '16px'
          }}
          onClick={() => onRate(rating)}
        >
          <span style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: 4 }}>{intervals[rating]}</span>
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{RATING_LABELS[rating]}</span>
        </button>
      ))}
    </div>
  );
}

export default function Study() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useStore();
  
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [intervals, setIntervals] = useState(null);
  const [sessionStats, setSessionStats] = useState({ studied: 0, new: 0, learning: 0, review: 0 });

  useEffect(() => {
    async function load() {
      try {
        const d = await decksApi.getAll().then(ds => ds.find(x => x.id === deckId));
        setDeck(d);
        const due = await studyApi.getDueCards(deckId, 50); // Get batch
        
        const stats = { studied: 0, new: 0, learning: 0, review: 0 };
        due.forEach(c => {
          if (c.card.state === 'new') stats.new++;
          else if (c.card.state === 'review') stats.review++;
          else stats.learning++;
        });
        setSessionStats(stats);
        
        setCards(due);
      } catch (e) {
        addToast('Error al cargar sesión', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [deckId, addToast]);

  const currentCardInfo = cards[currentIndex];

  const handleFlip = async () => {
    if (isFlipped || !currentCardInfo) return;
    setIsFlipped(true);
    try {
      const ivls = await studyApi.getNextIntervals(currentCardInfo.card.id);
      setIntervals(ivls);
    } catch (e) {
      addToast('Error calculando intervalos', 'error');
    }
  };

  const handleRate = async (rating) => {
    if (!currentCardInfo) return;
    try {
      await studyApi.answerCard(currentCardInfo.card.id, rating);
      
      const newStats = { ...sessionStats, studied: sessionStats.studied + 1 };
      setSessionStats(newStats);

      setIsFlipped(false);
      setIntervals(null);
      
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(i => i + 1);
      } else {
        const moreDue = await studyApi.getDueCards(deckId, 50);
        if (moreDue.length > 0) {
          setCards(moreDue);
          setCurrentIndex(0);
        } else {
          addToast('¡Has terminado todas las tarjetas por ahora!', 'success');
          navigate('/');
        }
      }
    } catch (e) {
      addToast('Error al guardar respuesta', 'error');
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  if (cards.length === 0) {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>¡Al día!</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>No hay más tarjetas pendientes en este mazo.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>Volver a Mazos</button>
      </div>
    );
  }

  const { card, note } = currentCardInfo;
  const fields = JSON.parse(note.fieldsJson || '{}');

  return (
    <div className="fade-in pb-10" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 140px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{deck?.name}</h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Tarjeta {currentIndex + 1} de {cards.length}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
          <span style={{ color: 'var(--srs-new)' }}>{sessionStats.new}</span>
          <span style={{ color: 'var(--srs-learning)' }}>{sessionStats.learning}</span>
          <span style={{ color: 'var(--srs-review)' }}>{sessionStats.review}</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <FlashCard 
          front={fields.front} 
          back={fields.back} 
          isFlipped={isFlipped}
          onFlip={handleFlip}
          cardState={card.state}
        />
        
        <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
          {!isFlipped ? (
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', borderRadius: '16px' }}
              onClick={handleFlip}
            >
              Mostrar Respuesta
            </button>
          ) : (
            <RatingButtons intervals={intervals} onRate={handleRate} />
          )}
        </div>
      </div>
    </div>
  );
}

