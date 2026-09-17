import { useEffect, useState } from 'react';

function FlashCard({ front, back, isFlipped, onFlip, animationsEnabled }) {
  const [showBack, setShowBack] = useState(isFlipped);

  useEffect(() => {
    if (!animationsEnabled) {
      setShowBack(isFlipped);
      return;
    }

    if (isFlipped) {
      const timer = setTimeout(() => setShowBack(true), 150);
      return () => clearTimeout(timer);
    } else {
      setShowBack(false);
    }
  }, [isFlipped, animationsEnabled]);

  const transitionStyle = animationsEnabled ? 'transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)' : 'none';

  return (
    <div 
      className="w-full max-w-2xl mx-auto cursor-pointer relative perspective-[1500px]"
      style={{ minHeight: '350px' }}
      onClick={onFlip}
    >
      <div 
        className="w-full h-full absolute inset-0 preserve-3d"
        style={{ 
          transition: transitionStyle,
          transform: isFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)',
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Front Face */}
        <div 
          className="absolute inset-0 w-full h-full bg-card border border-border rounded-2xl p-8 flex flex-col shadow-lg backface-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase mb-6 flex-shrink-0">
            Pregunta
          </div>
          
          <div className="flex-1 flex items-center justify-center overflow-y-auto">
            <div 
              className="prose prose-invert max-w-none text-center text-xl md:text-2xl leading-relaxed"
              dangerouslySetInnerHTML={{ __html: front }}
            />
          </div>

          <div className="text-center mt-6 text-sm text-muted-foreground animate-pulse flex-shrink-0">
            👆 Toca para ver la respuesta <span className="hidden sm:inline">· Espacio</span>
          </div>
        </div>

        {/* Back Face */}
        <div 
          className="absolute inset-0 w-full h-full bg-card border border-border rounded-2xl p-8 flex flex-col shadow-lg backface-hidden"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateX(180deg)' 
          }}
        >
          <div className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase mb-6 flex-shrink-0">
            Respuesta
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto">
            {showBack && (
              <div 
                className="prose prose-invert max-w-none text-center text-lg md:text-xl leading-relaxed animate-in fade-in duration-300"
                dangerouslySetInnerHTML={{ __html: back }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlashCard;
