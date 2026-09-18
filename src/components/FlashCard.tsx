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
      style={{ position: "relative", width: "100%", maxWidth: "32rem", margin: "0 auto", flex: 1, minHeight: "400px", maxHeight: "65vh", display: "flex", flexDirection: "column", cursor: !isFlipped ? "pointer" : "default" }}
      onClick={() => !isFlipped && onFlip()}
      style={{ perspective: '1200px' }}
    >
      {/* Front */}
      <div 
        className="card" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: "2rem", boxShadow: "0 10px 40px rgba(0,0,0,0.5)", border: "1px solid var(--border-medium)", borderRadius: "var(--radius-xl)" }}
        style={{
          borderRadius: '28px',
          borderTop: `5px solid ${getStateColor()}`,
          backfaceVisibility: 'hidden',
          transition: 'transform 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          zIndex: isFlipped ? 0 : 1,
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflowY: "auto", minHeight: 0, width: "100%", textAlign: "center", scrollbarWidth: "none" }} style={{ scrollbarWidth: 'none' }}>
            <div 
              style={{ fontSize: "1.75rem", lineHeight: 1.6, color: "var(--text-primary)", fontWeight: 500 }} 
              dangerouslySetInnerHTML={{ __html: front || '' }} 
            />
        </div>
        
        {!isFlipped && (
          <div style={{ marginTop: "1rem", paddingTop: "1rem", flexShrink: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", opacity: !isFlipped ? 0.7 : 1 }}>
            <RotateCcw size={18} />
            <span style={{ fontWeight: 500, letterSpacing: "0.05em" }}>Toca para voltear</span>
          </div>
        )}
      </div>

      {/* Back */}
      <div 
        className="card" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: "2rem", boxShadow: "0 10px 40px rgba(0,0,0,0.5)", border: "1px solid var(--border-medium)", borderRadius: "var(--radius-xl)" }}
        style={{
          borderRadius: '28px',
          borderTop: `5px solid ${getStateColor()}`,
          backfaceVisibility: 'hidden',
          transition: 'transform 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: isFlipped ? 'rotateY(0deg)' : 'rotateY(-180deg)',
          zIndex: isFlipped ? 1 : 0,
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflowY: "auto", minHeight: 0, width: "100%", textAlign: "center", scrollbarWidth: "none" }} style={{ scrollbarWidth: 'none' }}>
            <div 
              style={{ fontSize: "1.25rem", lineHeight: 1.6, color: "var(--text-primary)" }} 
              dangerouslySetInnerHTML={{ __html: back || '' }} 
            />
        </div>
      </div>
    </div>
  );
}

