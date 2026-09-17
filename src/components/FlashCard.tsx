import { RotateCcw } from 'lucide-react';

interface FlashCardProps {
  front: string;
  back: string;
  isFlipped: boolean;
  onFlip: () => void;
  cardState: string;
}

export default function FlashCard({ front, back, isFlipped, onFlip, cardState }: FlashCardProps) {
  const getStateColor = () => {
    if (cardState === 'new') return 'var(--srs-new, #3b82f6)';
    if (cardState === 'learning' || cardState === 'relearning') return 'var(--srs-learning, #f97316)';
    if (cardState === 'review') return 'var(--srs-review, #10b981)';
    return 'transparent';
  };

  return (
    <div 
      className={`relative w-full max-w-lg mx-auto flex-1 min-h-[400px] max-h-[65vh] flex flex-col ${!isFlipped ? 'cursor-pointer group' : ''}`}
      onClick={() => !isFlipped && onFlip()}
      style={{ perspective: '1200px' }}
    >
      {/* Front */}
      <div 
        className="absolute inset-0 flex flex-col p-6 sm:p-10 bg-card shadow-2xl border border-white/10"
        style={{
          borderRadius: '28px',
          borderTop: `5px solid ${getStateColor()}`,
          backfaceVisibility: 'hidden',
          transition: 'transform 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          zIndex: isFlipped ? 0 : 1,
        }}
      >
        <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto min-h-0 w-full text-center" style={{ scrollbarWidth: 'none' }}>
            <div 
              className="text-2xl sm:text-3xl leading-relaxed text-foreground/90 font-medium" 
              dangerouslySetInnerHTML={{ __html: front || '' }} 
            />
        </div>
        
        {!isFlipped && (
          <div className="mt-4 pt-4 shrink-0 flex justify-center items-center gap-2 text-sm text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity border-t border-white/5">
            <RotateCcw size={18} />
            <span className="font-medium tracking-wide">Toca para voltear</span>
          </div>
        )}
      </div>

      {/* Back */}
      <div 
        className="absolute inset-0 flex flex-col p-6 sm:p-10 bg-card shadow-2xl border border-white/10"
        style={{
          borderRadius: '28px',
          borderTop: `5px solid ${getStateColor()}`,
          backfaceVisibility: 'hidden',
          transition: 'transform 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: isFlipped ? 'rotateY(0deg)' : 'rotateY(-180deg)',
          zIndex: isFlipped ? 1 : 0,
        }}
      >
        <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto min-h-0 w-full text-center" style={{ scrollbarWidth: 'none' }}>
            <div 
              className="text-xl sm:text-2xl leading-relaxed text-foreground/90" 
              dangerouslySetInnerHTML={{ __html: back || '' }} 
            />
        </div>
      </div>
    </div>
  );
}

