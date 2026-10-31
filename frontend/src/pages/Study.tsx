import { parseNoteFields, renderCloze } from '../lib/noteFields';
import useStore from '../store/useStore';
import StudyLoadError from '../components/StudyLoadError';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import { ArrowLeft, Undo2, Eye, Timer, CheckCircle2, Trophy } from 'lucide-react';
import FlashCard from '../components/FlashCard';
import RatingButtons from '../components/RatingButtons';
import { useDecks } from '../hooks/useDecks';
import { useStudySession } from '../hooks/useStudySession';
import { useAuth } from '../context/AuthContext';
import { Card } from '../types';
import { Skeleton } from '../components/ui/skeleton';
import { sanitizeHtml } from '../lib/utils';

function getIntervalLabel(card: Card, rating: number) {
  if (!card) return '';
  const ease = card.easeFactor || 2.5;
  const interval = card.intervalDays || 0;
  const step = card.learningStep || 0;
  const learningSteps = [1, 10];

  if (card.state === 'new' || card.state === 'learning') {
    if (rating === 1) return formatMinutes(learningSteps[0]);
    if (rating === 2) {
      const curr = learningSteps[step] || learningSteps[0] || 1;
      const next = learningSteps[step + 1] || curr * 2;
      return formatMinutes(Math.round((curr + next) / 2));
    }
    if (rating === 3) {
      const nextStep = step + 1;
      if (nextStep >= learningSteps.length) return '1d';
      return formatMinutes(learningSteps[nextStep]);
    }
    return '4d';
  }
  if (card.state === 'relearning') {
    if (rating === 1) return '10m';
    if (rating === 2) return '10m';
    if (rating === 3) return `${Math.max(1, Math.round(interval * 0.7))}d`;
    return `${Math.max(1, Math.round(interval))}d`;
  }
  if (rating === 1) return '10m';
  if (rating === 2) return `${Math.max(1, Math.round(interval * 1.2))}d`;
  if (rating === 3) return `${Math.max(1, Math.round(interval * ease))}d`;
  return `${Math.max(1, Math.round(interval * Math.min(ease + 0.15, 3.5) * 1.3))}d`;
}

function formatMinutes(m: number) {
  if (m < 60) return `${m}m`;
  return `${Math.round(m / 60)}h`;
}

export default function Study() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const settings = useStore((s) => s.settings);
  const { user } = useAuth();

  const { data: decks = [], isError: deckError, refetch: retryDecks } = useDecks();
  const deck = decks.find((item) => item.id === deckId);
  const {
    queue,
    counts,
    undoStack,
    loading,
    loadError,
    saving,
    saveError,
    isComplete,
    isFlipped,
    sessionStats,
    loadNext,
    handleRate,
    handleUndo,
    handleFlip,
  } = useStudySession(deckId, settings?.studyOrder || 'new_first', user?.id);
  const [elapsedTime, setElapsedTime] = useState(0);
  useEffect(() => {
    if (!settings?.showTimer || isComplete) return;
    const timer = setInterval(
      () => setElapsedTime(Math.floor((Date.now() - sessionStats.startTime) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [settings?.showTimer, isComplete, sessionStats.startTime]);
  const currentPair = queue[0];
  const note = currentPair?.note;
  const card = currentPair?.card;
  const fields = useMemo(() => (note ? parseNoteFields(note.fieldsJson || '{}') : {}), [note]);

  const intervals = useMemo(() => {
    return Object.fromEntries(
      [1, 2, 3, 4].map((rating) => [rating, card ? getIntervalLabel(card, rating) : '…']),
    );
  }, [card]);

  const frontHtml = useMemo(() => {
    if (!note || !card) return '';
    if (note.noteType === 'cloze') {
      const idx = card.cardOrdinal;
      const html = sanitizeHtml(marked.parse(fields.text || '') as string);
      return renderCloze(html, idx, false);
    } else {
      if (card.cardOrdinal === 1) return sanitizeHtml(marked.parse(fields.back || '') as string);
      return sanitizeHtml(marked.parse(fields.front || '') as string);
    }
  }, [note?.id, note?.noteType, card?.id, card?.cardOrdinal, fields]);

  const backHtml = useMemo(() => {
    if (!note || !card) return '';
    if (note.noteType === 'cloze') {
      const idx = card.cardOrdinal;
      const html = sanitizeHtml(marked.parse(fields.text || '') as string);
      return renderCloze(html, idx, true);
    } else {
      if (card.cardOrdinal === 1) return sanitizeHtml(marked.parse(fields.front || '') as string);
      return sanitizeHtml(marked.parse(fields.back || '') as string);
    }
  }, [note?.id, note?.noteType, card?.id, card?.cardOrdinal, fields]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        e.defaultPrevented ||
        e.repeat ||
        saving ||
        saveError ||
        loading ||
        loadError ||
        target.closest('input, textarea, select, button, a, [contenteditable="true"]')
      )
        return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!isFlipped) handleFlip();
      } else if (isFlipped && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        handleRate(parseInt(e.key));
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'Escape') navigate('/');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    isFlipped,
    card,
    queue,
    undoStack,
    navigate,
    saving,
    saveError,
    loading,
    loadError,
    handleRate,
    handleUndo,
  ]);

  if (loadError || deckError)
    return (
      <StudyLoadError
        deckId={deckId}
        onRetry={() => {
          void retryDecks();
          void loadNext();
        }}
      />
    );

  if (loading) {
    return (
      <div className="study-container">
        <Skeleton className="w-[120px] h-[32px] mx-auto mb-4" />
        <Skeleton className="w-full h-[400px] mb-8" />
        <div className="flex justify-center">
          <Skeleton className="w-[150px] h-[48px]" />
        </div>
      </div>
    );
  }

  if (isComplete) {
    const elapsed = Math.round((Date.now() - sessionStats.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const accuracy =
      sessionStats.reviewed > 0
        ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
        : 0;

    return (
      <div className="fade-in flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <Trophy className="w-16 h-16 text-[var(--accent-primary)] mb-6" />
        <h2 className="text-3xl font-bold mb-3">¡Sesión Completada!</h2>
        <p className="text-muted-foreground text-lg mb-8 max-w-md">
          Has terminado todas las tarjetas de <strong className="text-primary">{deck?.name}</strong>
          .
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
            width: '100%',
            maxWidth: '600px',
          }}
        >
          <div
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
          >
            <CheckCircle2 className="text-primary mb-2" size={24} />
            <div className="text-2xl font-bold">{sessionStats.reviewed}</div>
            <div className="text-xs text-muted-foreground tracking-wider font-semibold mt-1">
              TARJETAS
            </div>
          </div>
          <div
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
          >
            <div className="text-2xl font-bold text-emerald-500">{accuracy}%</div>
            <div className="text-xs text-muted-foreground tracking-wider font-semibold mt-1">
              PRECISIÓN
            </div>
          </div>
          <div
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
          >
            <Timer className="text-muted-foreground mb-2" size={24} />
            <div className="text-2xl font-bold">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-muted-foreground tracking-wider font-semibold mt-1">
              TIEMPO
            </div>
          </div>
        </div>

        {undoStack.length > 0 && (
          <button className="sheet-action mb-4" disabled={saving} onClick={() => void handleUndo()}>
            Deshacer última revisión
          </button>
        )}
        <button
          className="btn btn-primary"
          style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={20} /> Volver a Mazos
        </button>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="fade-in flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-6" />
        <h2 className="text-2xl font-bold mb-2">¡Al día!</h2>
        <p className="text-muted-foreground text-lg mb-8 max-w-md">
          No hay más tarjetas pendientes en este mazo.
        </p>
        <button
          className="btn btn-primary"
          style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={20} /> Volver a Mazos
        </button>
      </div>
    );
  }

  return (
    <div
      className="fade-in study-session flex flex-col overflow-hidden max-w-3xl mx-auto w-full"
      style={{
        paddingTop: '1rem',
        paddingBottom: '1rem',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          padding: '0 0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => navigate(`/hub/${deckId}`)}
            aria-label="Volver al centro del mazo"
            style={{
              padding: '0.5rem',
              marginLeft: '-0.5rem',
              color: 'var(--text-muted)',
              borderRadius: '50%',
              transition: 'all 0.2s',
            }}
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="study-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
              {deck?.name}
            </h1>
            {settings?.showTimer && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                <Timer size={12} />
                {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 700 }}>
          <div
            aria-label={`Nuevas: ${counts.new}`}
            className="px-2 py-0.5 rounded-full border"
            style={{
              color: 'var(--accent-primary-light)',
              borderColor: 'var(--accent-primary)',
              background: 'rgba(var(--accent-primary-rgb), 0.1)',
            }}
          >
            {counts.new}
          </div>
          <div
            aria-label={`Aprendiendo: ${counts.learning}`}
            className="px-2 py-0.5 rounded border"
            style={{ color: 'var(--srs-learning)', borderColor: 'currentColor' }}
          >
            {counts.learning}
          </div>
          <div
            aria-label={`Revisión: ${counts.review}`}
            className="px-2 py-0.5 rounded border"
            style={{ color: 'var(--srs-review)', borderColor: 'currentColor' }}
          >
            {counts.review}
          </div>
        </div>
      </div>

      {/* Card area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          position: 'relative',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 0,
            padding: '1rem 0',
            width: '100%',
          }}
        >
          <FlashCard
            front={frontHtml}
            back={backHtml}
            isFlipped={isFlipped}
            onFlip={handleFlip}
            cardState={card.state}
          />
        </div>

        {/* Controls */}
        <div
          style={{
            marginTop: '1rem',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            paddingBottom: '1rem',
          }}
        >
          {!isFlipped ? (
            <button
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '1.25rem',
                fontSize: '1.25rem',
                borderRadius: 'var(--radius-xl)',
              }}
              onClick={handleFlip}
            >
              <Eye size={20} /> Mostrar Respuesta
            </button>
          ) : (
            <>
              {saveError && (
                <div role="alert" className="card">
                  <p>
                    No se ha confirmado el guardado. Reintenta la misma respuesta para continuar.
                  </p>
                  <button
                    className="sheet-action"
                    disabled={saving}
                    onClick={() => void handleRate(0)}
                  >
                    Reintentar guardado
                  </button>
                </div>
              )}
              <RatingButtons
                intervals={intervals}
                onRate={handleRate}
                disabled={saving || saveError}
              />
              {saving && <p role="status">Guardando revisión…</p>}
            </>
          )}

          <div className="flex justify-center mt-2">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0 || saving || saveError}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${
                  undoStack.length === 0
                    ? 'text-muted-foreground/30 cursor-not-allowed'
                    : 'text-muted-foreground hover:bg-[var(--bg-card-hover)] hover:text-foreground cursor-pointer'
                }
              `}
            >
              <Undo2 size={16} /> Deshacer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
