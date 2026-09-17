import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import FlashCard from '../components/FlashCard';
import useStore from '../store/useStore';
import useAuthStore from '../store/useAuthStore';
import { studyApi, decksApi } from '../services/api';

const RATING_COLORS = {
  1: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  2: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
  3: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
  4: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' }
};
const RATING_LABELS = { 1: 'Otra vez', 2: 'Difícil', 3: 'Bien', 4: 'Fácil' };

function getIntervalLabel(card, rating) {
  if (!card) return '';
  const ease = card.easeFactor || 2.5;
  const interval = card.intervalDays || 0;
  const step = card.learningStep || 0;
  const learningSteps = [1, 10]; // default steps in minutes

  if (card.state === 'new' || card.state === 'learning') {
    if (rating === 1) return formatMinutes(learningSteps[0]); // back to first step
    if (rating === 2) {
      const curr = learningSteps[step] || learningSteps[0] || 1;
      const next = learningSteps[step + 1] || curr * 2;
      return formatMinutes(Math.round((curr + next) / 2));
    }
    if (rating === 3) {
      const nextStep = step + 1;
      if (nextStep >= learningSteps.length) return '1d'; // graduate
      return formatMinutes(learningSteps[nextStep]);
    }
    return '4d'; // EASY: graduate immediately
  }
  if (card.state === 'relearning') {
    if (rating === 1) return '10m';
    if (rating === 2) return '10m';
    if (rating === 3) return `${Math.max(1, Math.round(interval * 0.7))}d`;
    return `${Math.max(1, Math.round(interval))}d`;
  }
  // Review state
  if (rating === 1) return '10m';
  if (rating === 2) return `${Math.max(1, Math.round(interval * 1.2))}d`;
  if (rating === 3) return `${Math.max(1, Math.round(interval * ease))}d`;
  return `${Math.max(1, Math.round(interval * ease * 1.3))}d`;
}

function formatMinutes(m) {
  if (m < 60) return `${m}m`;
  return `${Math.round(m / 60)}h`;
}

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
          onClick={(e) => {
            e.stopPropagation();
            onRate(rating);
          }}
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
  const { addToast, settings } = useStore();
  const { updateUser, user } = useAuthStore();
  
  const [deck, setDeck] = useState(null);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  
  const [counts, setCounts] = useState({ new: 0, learning: 0, review: 0 });
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0, startTime: Date.now(), coinsEarned: 0 });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [coinFloat, setCoinFloat] = useState(null);
  const [startMs, setStartMs] = useState(Date.now());

  useEffect(() => {
    if (!settings?.showTimer || isComplete) return;
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - sessionStats.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [settings?.showTimer, isComplete, sessionStats.startTime]);

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const decks = await decksApi.getAll();
      const d = decks.find(x => x.id === deckId);
      if (!d) { addToast('Mazo no encontrado', 'error'); navigate('/'); return; }
      setDeck(d);
      
      const pairs = await studyApi.getDueCards(deckId, 1000); // get pairs {card, note}
      if (pairs.length === 0) { setIsComplete(true); setLoading(false); return; }

      // Sort
      const order = settings?.studyOrder || 'new_first';
      if (order === 'new_first') {
        pairs.sort((a, b) => {
          if (a.card.state === 'new' && b.card.state !== 'new') return -1;
          if (a.card.state !== 'new' && b.card.state === 'new') return 1;
          return 0;
        });
      } else if (order === 'review_first') {
        pairs.sort((a, b) => {
          if (a.card.state === 'review' && b.card.state !== 'review') return -1;
          if (a.card.state !== 'review' && b.card.state === 'review') return 1;
          return 0;
        });
      } else if (order === 'mixed') {
        pairs.sort(() => Math.random() - 0.5);
      }

      const now = new Date();
      setCounts({
        new: pairs.filter(p => p.card.state === 'new').length,
        learning: pairs.filter(p => (p.card.state === 'learning' || p.card.state === 'relearning') && new Date(p.card.due) <= now).length,
        review: pairs.filter(p => p.card.state === 'review' && new Date(p.card.due) <= now).length,
      });

      setQueue(pairs);
      setCurrentIndex(0);
      setIsFlipped(false);
      setStartMs(Date.now());
    } catch (e) {
      addToast('Error al cargar sesión', 'error');
    } finally {
      setLoading(false);
    }
  }, [deckId, addToast, navigate, settings?.studyOrder]);

  useEffect(() => { loadSession(); }, [loadSession]);

  const current = queue[currentIndex];
  const card = current?.card;
  const note = current?.note;

  const getFields = () => {
    if (!note) return { front: '', back: '' };
    try {
      return JSON.parse(note.fieldsJson);
    } catch { return { front: note.fieldsJson || '', back: '' }; }
  };

  const getFront = () => {
    const f = getFields();
    if (card?.cardOrdinal === 1) return marked.parse(f.back || '');
    if (note?.noteType === 'cloze') {
      return (f.text || '').replace(/\{\{c\d+::(.*?)\}\}/g, '<span style="color:var(--accent-primary);border-bottom:2px dashed var(--accent-primary);padding:0 4px">[...]</span>');
    }
    return marked.parse(f.front || f.text || '');
  };

  const getBack = () => {
    const f = getFields();
    if (card?.cardOrdinal === 1) return marked.parse(f.front || '');
    if (note?.noteType === 'cloze') {
      const text = (f.text || '').replace(/\{\{c\d+::(.*?)\}\}/g, '<span style="color:var(--accent-primary);border-bottom:2px dashed var(--accent-primary);padding:0 4px">$1</span>');
      return marked.parse(text) + (f.extra ? `<div style="width: 60%; height: 1px; background: var(--border-subtle); margin: 16px auto;"></div><div style="font-size: 0.95rem; color: var(--text-muted);">${marked.parse(f.extra)}</div>` : '');
    }
    return marked.parse(f.back || f.extra || '');
  };

  const intervals = useMemo(() => {
    if (!isFlipped || !card) return null;
    return {
      1: getIntervalLabel(card, 1),
      2: getIntervalLabel(card, 2),
      3: getIntervalLabel(card, 3),
      4: getIntervalLabel(card, 4),
    };
  }, [isFlipped, card]);

  const handleFlip = () => {
    if (isFlipped || !card) return;
    setIsFlipped(true);
  };

  const handleRate = async (rating) => {
    if (!card) return;
    
    // Save undo state
    setUndoStack(prev => [...prev, { pair: current, index: currentIndex }]);
    
    setIsFlipped(false);
    
    setSessionStats(prev => ({
      ...prev,
      reviewed: prev.reviewed + 1,
      correct: rating >= 3 ? prev.correct + 1 : prev.correct,
    }));

    setCounts(prev => {
      const n = { ...prev };
      if (card.state === 'new') n.new = Math.max(0, n.new - 1);
      else if (card.state === 'learning' || card.state === 'relearning') n.learning = Math.max(0, n.learning - 1);
      else if (card.state === 'review') n.review = Math.max(0, n.review - 1);
      return n;
    });

    const remaining = queue.filter((_, i) => i !== currentIndex);
    if (remaining.length === 0) {
      setIsComplete(true);
    } else {
      setQueue(remaining);
      setCurrentIndex(0);
      setStartMs(Date.now());
    }

    try {
      const timeTakenMs = Date.now() - startMs;
      const result = await studyApi.reviewCard(card.id, { rating, timeTakenMs });
      if (result && result.coinsEarned) {
        setCoinFloat({ amount: result.coinsEarned, key: Date.now() });
        setSessionStats(prev => ({ ...prev, coinsEarned: prev.coinsEarned + result.coinsEarned }));
        if (user) updateUser({ ...user, points: result.totalCoins });
        setTimeout(() => setCoinFloat(null), 1500);
      }
    } catch (e) {
      addToast('Error guardando revisión', 'error');
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    const newQueue = [...queue];
    newQueue.splice(currentIndex, 0, last.pair);
    setQueue(newQueue);
    setIsFlipped(false);
    setUndoStack(prev => prev.slice(0, -1));
    setSessionStats(prev => ({ ...prev, reviewed: Math.max(0, prev.reviewed - 1) }));
    setCounts(prev => {
      const n = { ...prev };
      const s = last.pair.card.state;
      if (s === 'new') n.new++;
      else if (s === 'learning' || s === 'relearning') n.learning++;
      else if (s === 'review') n.review++;
      return n;
    });
    setIsComplete(false);
    addToast('Deshecho', 'info');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!isFlipped) handleFlip(); }
      else if (isFlipped && ['1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); handleRate(parseInt(e.key)); }
      else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleUndo(); }
      else if (e.key === 'Escape') navigate('/');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFlipped, card, queue, currentIndex, undoStack]);

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  if (isComplete) {
    const elapsed = Math.round((Date.now() - sessionStats.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const accuracy = sessionStats.reviewed > 0 ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100) : 0;

    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>¡Sesión Completada!</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Has terminado todas las tarjetas de <strong>{deck?.name}</strong>.</p>
        
        <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem', width: '100%', maxWidth: '400px' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{sessionStats.reviewed}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TARJETAS</div>
            </div>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{accuracy}%</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PRECISIÓN</div>
            </div>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{minutes}:{seconds.toString().padStart(2, '0')}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TIEMPO</div>
            </div>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ffd700' }}>+{sessionStats.coinsEarned} 🪙</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MONEDAS</div>
            </div>
        </div>

        <button className="btn btn-primary" onClick={() => navigate('/')}>Volver a Mazos</button>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📭</div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>¡Al día!</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>No hay más tarjetas pendientes en este mazo.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>Volver a Mazos</button>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: 'calc(100vh - 100px)', // Fixed height fitting viewport leaving space for navbar
        overflow: 'hidden' // No unexpected scrolling!
    }}>
      {coinFloat && (
        <div key={coinFloat.key} style={{
            position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)',
            color: '#ffd700', fontSize: '1.5rem', fontWeight: 'bold', pointerEvents: 'none',
            animation: 'floatUp 1.5s ease-out forwards', zIndex: 100
        }}>
          +{coinFloat.amount} 🪙
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="icon-btn" onClick={() => navigate('/')} style={{ padding: '8px' }}>←</button>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{deck?.name}</h2>
            {settings?.showTimer && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                ⏱️ {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
          <span style={{ color: 'var(--accent-primary)', opacity: 0.8 }}>{counts.new}</span>
          <span style={{ color: 'var(--accent-primary)', opacity: 0.9 }}>{counts.learning}</span>
          <span style={{ color: 'var(--accent-primary)' }}>{counts.review}</span>
        </div>
      </div>

      {/* Card area (expands to fill available space) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <FlashCard 
              front={getFront()} 
              back={getBack()} 
              isFlipped={isFlipped}
              onFlip={handleFlip}
              cardState={card.state}
            />
        </div>
        
        {/* Controls fixed at bottom of card area */}
        <div style={{ marginTop: '1rem', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button 
              className="icon-btn" 
              onClick={handleUndo} 
              disabled={undoStack.length === 0}
              style={{ opacity: undoStack.length === 0 ? 0.3 : 1, fontSize: '0.85rem', padding: '8px 12px' }}
            >
              ↩️ Deshacer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
