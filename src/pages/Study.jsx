import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FlashCard from '../components/FlashCard';
import RatingButtons from '../components/RatingButtons';
import useStore from '../store/useStore';
import { decksApi, studyApi, notesApi } from '../services/api';

// Helper: compute SM-2 interval labels for buttons (client-side preview only)
function getIntervalLabel(card, rating) {
  if (!card) return '';
  const ease = card.easeFactor || 2.5;
  const interval = card.intervalDays || 0;
  const step = card.learningStep || 0;
  const learningSteps = [1, 10]; // default steps in minutes

  if (card.state === 'new' || card.state === 'learning') {
    if (rating === 1) return formatMinutes(learningSteps[0]); // back to first step
    if (rating === 2) {
      // HARD: average of current step and next, or 1.5x current
      const curr = learningSteps[step] || learningSteps[0] || 1;
      const next = learningSteps[step + 1] || curr * 2;
      return formatMinutes(Math.round((curr + next) / 2));
    }
    if (rating === 3) {
      // GOOD: advance to next step
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

function Study() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { addToast, settings } = useStore();

  const [deck, setDeck] = useState(null);
  const [queue, setQueue] = useState([]); // array of {card, note}
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [counts, setCounts] = useState({ new: 0, learning: 0, review: 0 });
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0, startTime: Date.now() });
  const [undoStack, setUndoStack] = useState([]); // { card, noteFields }
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);

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
      // Load deck info
      const decks = await decksApi.getAll();
      const d = decks.find(d => d.id === deckId);
      if (!d) { addToast('Mazo no encontrado', 'error'); navigate('/'); return; }
      setDeck(d);

      // Load due cards
      const cards = await studyApi.getDueCards(deckId, 200);
      if (cards.length === 0) { setIsComplete(true); setLoading(false); return; }

      // Load notes for all cards
      const notes = await notesApi.getByDeck(deckId);
      const notesMap = Object.fromEntries(notes.map(n => [n.id, n]));

      const pairs = cards.map(card => ({ card, note: notesMap[card.noteId] })).filter(p => p.note);

      // Sort according to settings
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
    } catch (e) {
      addToast('Error cargando sesión: ' + e.message, 'error');
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
      const f = JSON.parse(note.fieldsJson);
      return f;
    } catch { return { front: note.fieldsJson || '', back: '' }; }
  };

  const getFront = () => {
    const f = getFields();
    if (card?.cardOrdinal === 1) return f.back || '';
    if (note?.noteType === 'cloze') {
      return (f.text || '').replace(/\{\{c\d+::(.*?)\}\}/g, '<span style="color:var(--srs-new);border-bottom:2px dashed var(--srs-new);padding:0 4px">[...]</span>');
    }
    return f.front || f.text || '';
  };

  const getBack = () => {
    const f = getFields();
    if (card?.cardOrdinal === 1) return f.front || '';
    if (note?.noteType === 'cloze') {
      const text = (f.text || '').replace(/\{\{c\d+::(.*?)\}\}/g, '<span style="color:var(--srs-new);border-bottom:2px dashed var(--srs-new);padding:0 4px">$1</span>');
      return text + (f.extra ? `<div style="width: 60%; height: 1px; background: var(--border-color); margin: 16px auto;"></div><div style="font-size: 0.95rem; color: var(--text-dim);">${f.extra}</div>` : '');
    }
    return f.back || f.extra || '';
  };

  const intervals = {
    1: getIntervalLabel(card, 1),
    2: getIntervalLabel(card, 2),
    3: getIntervalLabel(card, 3),
    4: getIntervalLabel(card, 4),
  };

  const handleFlip = () => { if (!isFlipped) setIsFlipped(true); };

  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleRate = async (rating) => {
    if (!card || isTransitioning) return;
    const startMs = Date.now();

    // Save undo state
    setUndoStack(prev => [...prev, { pair: current, index: currentIndex }]);

    // Start transition: flip card back first, THEN change content
    setIsTransitioning(true);
    setIsFlipped(false);

    setSessionStats(prev => ({
      ...prev,
      reviewed: prev.reviewed + 1,
      correct: rating >= 3 ? prev.correct + 1 : prev.correct,
    }));

    // Update counts
    setCounts(prev => {
      const n = { ...prev };
      if (card.state === 'new') n.new = Math.max(0, n.new - 1);
      else if (card.state === 'learning' || card.state === 'relearning') n.learning = Math.max(0, n.learning - 1);
      else if (card.state === 'review') n.review = Math.max(0, n.review - 1);
      return n;
    });

    // Wait for flip-back animation to complete before showing next card
    setTimeout(() => {
      const remaining = queue.filter((_, i) => i !== currentIndex);
      if (remaining.length === 0) {
        setIsComplete(true);
      } else {
        setQueue(remaining);
        setCurrentIndex(0);
      }
      setIsTransitioning(false);
    }, 350); // slightly shorter than 0.6s flip animation

    // Fire-and-forget: send review to backend
    try {
      const timeTakenMs = Date.now() - startMs;
      await studyApi.reviewCard(card.id, { rating, timeTakenMs });
    } catch (e) {
      addToast('Error guardando revisión: ' + e.message, 'error');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFlipped, card, queue, currentIndex, undoStack]);

  if (loading) {
    return (
      <div className="study-container animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner-sm" style={{ width: 40, height: 40, margin: '0 auto 16px', borderWidth: 3 }} />
          <p style={{ color: 'var(--text-muted)' }}>Preparando sesión...</p>
        </div>
      </div>
    );
  }

  // Session complete screen
  if (isComplete) {
    const elapsed = Math.round((Date.now() - sessionStats.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const accuracy = sessionStats.reviewed > 0 ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100) : 0;

    return (
      <div className="study-container animate-fade-in">
        <div className="session-complete">
          <div className="session-complete-icon">🎉</div>
          <h2>¡Sesión Completada!</h2>
          <p>Has terminado todas las tarjetas pendientes de <strong>{deck?.name}</strong>.</p>
          <div className="session-stats">
            <div className="session-stat">
              <div className="session-stat-value">{sessionStats.reviewed}</div>
              <div className="session-stat-label">Tarjetas</div>
            </div>
            <div className="session-stat">
              <div className="session-stat-value">{accuracy}%</div>
              <div className="session-stat-label">Precisión</div>
            </div>
            <div className="session-stat">
              <div className="session-stat-value">{minutes}:{seconds.toString().padStart(2, '0')}</div>
              <div className="session-stat-label">Tiempo</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="primary-btn" onClick={() => navigate('/')}>← Volver a Mazos</button>
            <button className="glass-btn" onClick={() => navigate(`/add/${deckId}`)}>➕ Añadir más tarjetas</button>
          </div>
        </div>
      </div>
    );
  }

  if (!card || !note) {
    return (
      <div className="study-container animate-fade-in">
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <h3>No hay tarjetas pendientes</h3>
          <p>Añade tarjetas a este mazo o espera a que haya revisiones pendientes.</p>
          <button className="primary-btn" onClick={() => navigate(`/add/${deckId}`)}>➕ Añadir Tarjetas</button>
        </div>
      </div>
    );
  }

  return (
    <div className="study-container animate-fade-in">
      {/* Header */}
      <div className="study-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="glass-btn" onClick={() => navigate('/')} style={{ padding: '8px 12px' }}>←</button>
          <span className="study-deck-name">{deck?.name}</span>
          {settings?.showTimer && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginLeft: '8px', fontVariantNumeric: 'tabular-nums' }}>
              ⏱️ {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
            </span>
          )}
        </div>
        <div className="study-progress">
          <span className="study-count new">{counts.new}</span>
          <span className="study-count learning">{counts.learning}</span>
          <span className="study-count review">{counts.review}</span>
        </div>
      </div>

      {/* Card */}
      <FlashCard
        front={getFront()}
        back={getBack()}
        isFlipped={isFlipped}
        onFlip={handleFlip}
        animationsEnabled={settings?.animationsEnabled ?? true}
      />

      {/* Actions */}
      {!isFlipped ? (
        <button className="show-answer-btn" onClick={handleFlip}>
          Mostrar Respuesta
          <span style={{ opacity: 0.6, marginLeft: 8, fontSize: '0.85rem' }}>Space</span>
        </button>
      ) : (
        <RatingButtons intervals={intervals} onRate={handleRate} />
      )}

      {/* Bottom Actions */}
      <div className="study-actions">
        <button className="study-action-btn" onClick={handleUndo} disabled={undoStack.length === 0}>
          ↩️ Deshacer
        </button>
        <button className="study-action-btn" onClick={() => navigate('/')}>
          🏠 Salir
        </button>
      </div>
    </div>
  );
}

export default Study;
