import { useState, useRef, useEffect } from 'react';

function FlashCard({ front, back, isFlipped, onFlip, animationsEnabled = true }) {
  return (
    <>
      <style>{`
        .flashcard-html p { margin-bottom: 1rem; }
        .flashcard-html p:last-child { margin-bottom: 0; }
        .flashcard-html ul { list-style-type: disc; margin-bottom: 1rem; padding-left: 1.5rem; }
        .flashcard-html ol { list-style-type: decimal; margin-bottom: 1rem; padding-left: 1.5rem; }
        .flashcard-html li { margin-bottom: 0.25rem; }
        .flashcard-html h1 { font-size: 1.5rem; font-weight: bold; margin: 1.25rem 0 0.75rem 0; }
        .flashcard-html h2 { font-size: 1.25rem; font-weight: bold; margin: 1.25rem 0 0.75rem 0; }
        .flashcard-html h3 { font-size: 1.1rem; font-weight: bold; margin: 1.25rem 0 0.75rem 0; }
        .flashcard-html pre { background: rgba(0,0,0,0.4); padding: 1rem; border-radius: 0.5rem; overflow-x: auto; font-family: monospace; font-size: 0.85em; margin: 1rem 0; border: 1px solid rgba(255,255,255,0.1); }
        .flashcard-html code { background: rgba(255,255,255,0.1); padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-family: monospace; font-size: 0.9em; }
        .flashcard-html img { max-width: 100%; border-radius: 0.5rem; margin: 1rem 0; }
      `}</style>
      <div 
        className="w-full flex-1 flex flex-col mb-3 cursor-pointer" 
        style={{ perspective: '1200px', minHeight: '350px' }} 
        onClick={onFlip}
      >
        <div
          className="relative w-full h-full"
          style={{
            transformStyle: 'preserve-3d',
            transition: animationsEnabled ? 'transform 0.5s cubic-bezier(0.4, 0.0, 0.2, 1)' : 'none',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front */}
          <div 
            className="absolute inset-0 w-full h-full bg-[#1C1C1E] border border-white/10 rounded-[24px] p-6 flex flex-col shadow-lg"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest shrink-0">Pregunta</span>
            <div className="flex-1 overflow-y-auto mt-4 text-white text-[1.15rem] leading-relaxed flex flex-col justify-start">
              <div className="flashcard-html m-auto w-full" dangerouslySetInnerHTML={{ __html: front }} />
            </div>
            {!isFlipped && (
              <div className="shrink-0 mt-4 pt-4 border-t border-white/5 text-[0.75rem] text-gray-400 flex items-center justify-center gap-1.5">
                <span>👆</span> Toca para ver la respuesta <span className="opacity-50">· <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded">Space</kbd></span>
              </div>
            )}
          </div>

          {/* Back */}
          <div 
            className="absolute inset-0 w-full h-full bg-[#1C1C1E] border border-white/10 rounded-[24px] p-6 flex flex-col shadow-lg"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest shrink-0">Respuesta</span>
            <div className="flex-1 overflow-y-auto mt-4 text-white text-[1.15rem] leading-relaxed flex flex-col justify-start">
              <div className="flashcard-html m-auto w-full" dangerouslySetInnerHTML={{ __html: back }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default FlashCard;
