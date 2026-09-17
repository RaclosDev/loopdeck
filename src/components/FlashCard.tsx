import React from 'react';
import { RotateCcw } from 'lucide-react';

export default function FlashCard({ front, back, isFlipped, onFlip, cardState }) {
  const getStateColor = () => {
    if (cardState === 'new') return 'var(--srs-new, #3b82f6)';
    if (cardState === 'learning' || cardState === 'relearning') return 'var(--srs-learning, #f97316)';
    if (cardState === 'review') return 'var(--srs-review, #10b981)';
    return 'transparent';
  };

  return (
    <div 
      className={`relative w-full flex flex-col perspective-1000 min-h-[300px] ${!isFlipped ? 'cursor-pointer group' : ''}`}
      onClick={() => !isFlipped && onFlip()}
      style={{ perspective: '1000px' }}
    >
      {/* Front */}
      <div 
        className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-card rounded-2xl shadow-lg border border-white/5"
        style={{
          borderTop: `4px solid ${getStateColor()}`,
          backfaceVisibility: 'hidden',
          transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          zIndex: isFlipped ? 0 : 1,
        }}
      >
        <div 
          className="text-xl leading-relaxed text-foreground/90 w-full overflow-y-auto max-h-full" 
          dangerouslySetInnerHTML={{ __html: front || '' }} 
        />
        
        {!isFlipped && (
          <div className="absolute bottom-4 flex items-center gap-2 text-sm text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity">
            <RotateCcw size={16} />
            <span>Toca para voltear</span>
          </div>
        )}
      </div>

      {/* Back */}
      <div 
        className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-card rounded-2xl shadow-xl border border-white/5 overflow-hidden"
        style={{
          borderTop: `4px solid ${getStateColor()}`,
          backfaceVisibility: 'hidden',
          transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: isFlipped ? 'rotateY(0deg)' : 'rotateY(-180deg)',
          zIndex: isFlipped ? 1 : 0,
        }}
      >
        <div 
          className="text-xl leading-relaxed text-foreground/90 w-full overflow-y-auto max-h-full" 
          dangerouslySetInnerHTML={{ __html: back || '' }} 
        />
      </div>
    </div>
  );
}

