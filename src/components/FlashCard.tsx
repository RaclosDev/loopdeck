import React from 'react';

export default function FlashCard({ front, back, isFlipped, onFlip, cardState }) {
  const getStateColor = () => {
    if (cardState === 'new') return 'var(--srs-new)';
    if (cardState === 'learning' || cardState === 'relearning') return 'var(--srs-learning)';
    if (cardState === 'review') return 'var(--srs-review)';
    return 'transparent';
  };

  return (
    <div 
      style={{ 
        perspective: '1000px', 
        width: '100%', 
        minHeight: '300px',
        display: 'flex',
        flexDirection: 'column',
        cursor: !isFlipped ? 'pointer' : 'default',
        position: 'relative'
      }}
      onClick={() => !isFlipped && onFlip()}
    >
      {/* Front */}
      <div 
        className="glass-panel"
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          borderTop: `4px solid ${getStateColor()}`,
          backfaceVisibility: 'hidden',
          transition: 'transform 0.5s cubic-bezier(0.4, 0.0, 0.2, 1)',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          zIndex: isFlipped ? 0 : 1,
        }}
      >
        <div style={{ fontSize: '1.25rem', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: front || '' }} />
      </div>

      {/* Back */}
      <div 
        className="glass-panel"
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          borderTop: `4px solid ${getStateColor()}`,
          backfaceVisibility: 'hidden',
          transition: 'transform 0.5s cubic-bezier(0.4, 0.0, 0.2, 1)',
          transform: isFlipped ? 'rotateY(0deg)' : 'rotateY(-180deg)',
          zIndex: isFlipped ? 1 : 0,
          overflowY: 'auto'
        }}
      >
        <div style={{ fontSize: '1.25rem', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: back || '' }} />
      </div>
    </div>
  );
}
