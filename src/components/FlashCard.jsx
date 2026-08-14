import { useState, useRef, useEffect } from 'react';

function FlashCard({ front, back, isFlipped, onFlip, animationsEnabled = true }) {
  const [cardHeight, setCardHeight] = useState(350);
  const frontRef = useRef(null);
  const backRef = useRef(null);

  useEffect(() => {
    // Dynamically adjust card height based on content
    const updateHeight = () => {
      const fh = frontRef.current?.scrollHeight || 350;
      const bh = backRef.current?.scrollHeight || 350;
      setCardHeight(Math.max(350, fh, bh));
    };

    updateHeight();
    // Re-calculate on flip
    const timer = setTimeout(updateHeight, 100);
    return () => clearTimeout(timer);
  }, [front, back, isFlipped]);

  return (
    <div className="flashcard-wrapper" onClick={onFlip}>
      <div
        className={`flashcard ${isFlipped ? 'flipped' : ''}`}
        style={{ height: cardHeight, transition: !animationsEnabled ? 'none' : '' }}
      >
        {/* Front */}
        <div className="flashcard-face flashcard-front" ref={frontRef}>
          <span className="flashcard-face-label">Pregunta</span>
          <div
            className="flashcard-content"
            dangerouslySetInnerHTML={{ __html: front }}
          />
          {!isFlipped && (
            <div className="flashcard-tap-hint">
              <span>👆</span> Toca para ver la respuesta · <kbd>Space</kbd>
            </div>
          )}
        </div>

        {/* Back */}
        <div className="flashcard-face flashcard-back" ref={backRef}>
          <span className="flashcard-face-label">Respuesta</span>
          <div
            className="flashcard-content"
            dangerouslySetInnerHTML={{ __html: back }}
          />
        </div>
      </div>
    </div>
  );
}

export default FlashCard;
