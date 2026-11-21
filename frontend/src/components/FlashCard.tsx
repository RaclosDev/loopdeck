import { sanitizeHtml } from '../lib/utils';
import { isLongCardContent } from '../lib/noteFields';

interface FlashCardProps {
  front: string;
  back: string;
  isFlipped: boolean;
  onFlip: () => void;
  cardState: string;
  /** Tarjeta con mucho texto: ocupa todo el ancho y usa letra de lectura. */
  reading?: boolean;
}

export default function FlashCard({
  front,
  back,
  isFlipped,
  onFlip,
  cardState,
  reading = false,
}: FlashCardProps) {
  // Solo la cara que de verdad es larga lleva tipografía de lectura; una
  // pregunta corta sigue centrada y grande.
  const frontProse = reading && isLongCardContent(front || '');
  const getStateColor = () => {
    if (cardState === 'new') return 'var(--srs-new, #3b82f6)';
    if (cardState === 'learning' || cardState === 'relearning')
      return 'var(--srs-learning, #f97316)';
    if (cardState === 'review') return 'var(--srs-review, #10b981)';
    return 'var(--ink)';
  };

  return (
    <div
      className="flashcard-frame"
      style={{
        perspective: '1200px',
        position: 'relative',
        width: '100%',
        maxWidth: reading ? 'none' : '32rem',
        margin: '0 auto',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        cursor: !isFlipped ? 'pointer' : 'default',
      }}
      role="button"
      tabIndex={0}
      aria-label={isFlipped ? 'Tarjeta volteada' : 'Voltear tarjeta'}
      onKeyDown={(e) => {
        if (!isFlipped && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault();
          onFlip();
        }
      }}
      onClick={() => !isFlipped && onFlip()}
    >
      {/* Front */}
      <div
        className="card flashcard-face"
        aria-hidden={isFlipped}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: reading ? '1.25rem 1.5rem' : '2rem',
          borderTop: `5px solid ${getStateColor()}`,
          backfaceVisibility: 'hidden',
          transition: 'transform 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          zIndex: isFlipped ? 0 : 1,
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflowY: 'auto',
            minHeight: 0,
            width: '100%',
            textAlign: 'center',
            scrollbarWidth: 'thin',
          }}
        >
          <div
            className={frontProse ? 'card-reading' : undefined}
            style={{
              // margen automático: centra si cabe y, si no cabe, no recorta el principio
              margin: 'auto 0',
              width: frontProse ? '100%' : undefined,
              maxWidth: frontProse ? '46rem' : '100%',
              fontSize: frontProse ? '1.1rem' : reading ? '1.35rem' : '1.75rem',
              lineHeight: 1.6,
              color: 'var(--text-primary)',
              fontWeight: 500,
            }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(front || '') }}
          />
        </div>
      </div>

      {/* Back */}
      <div
        className="card flashcard-face"
        aria-hidden={!isFlipped}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: reading ? '1.25rem 1.5rem' : '2rem',
          borderTop: `5px solid ${getStateColor()}`,
          backfaceVisibility: 'hidden',
          transition: 'transform 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: isFlipped ? 'rotateY(0deg)' : 'rotateY(-180deg)',
          zIndex: isFlipped ? 1 : 0,
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflowY: 'auto',
            minHeight: 0,
            width: '100%',
            textAlign: 'center',
            scrollbarWidth: 'thin',
          }}
        >
          <div
            className={reading ? 'card-reading' : undefined}
            style={{
              // en modo lectura el texto empieza arriba, como una página
              margin: reading ? 0 : 'auto 0',
              width: reading ? '100%' : undefined,
              maxWidth: reading ? '46rem' : '100%',
              fontSize: reading ? '1.1rem' : '1.25rem',
              lineHeight: 1.6,
              color: 'var(--text-primary)',
            }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(back || '') }}
          />
        </div>
      </div>
    </div>
  );
}
