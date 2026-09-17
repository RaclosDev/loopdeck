import { useState, useRef, useEffect } from 'react';
import './FlashCard.css';

function FlashCard({ front, back, isFlipped, onFlip, animationsEnabled = true }) {
  return (
    <div className="flashcard-wrapper" onClick={onFlip}>
      <div
        className={`flashcard ${isFlipped ? 'flipped' : ''}`}
        style={!animationsEnabled ? { transition: 'none' } : undefined}
      >
        {/* Front */}
        <div className="flashcard-face flashcard-front">
          <span className="flashcard-face-label">Pregunta</span>
          <div className="flashcard-content">
            <div className="flashcard-inner" dangerouslySetInnerHTML={{ __html: front }} />
          </div>
          {!isFlipped && (
            <div className="flashcard-tap-hint">
              <span>👆</span> Toca para ver la respuesta <span className="keyboard-hint">· <kbd>Space</kbd></span>
            </div>
          )}
        </div>

        {/* Back */}
        <div className="flashcard-face flashcard-back">
          <span className="flashcard-face-label">Respuesta</span>
          <div className="flashcard-content">
            <div className="flashcard-inner" dangerouslySetInnerHTML={{ __html: back }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlashCard;
