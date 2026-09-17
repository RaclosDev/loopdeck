import { Clock } from 'lucide-react';

const RATING_STYLES = {
  again: { color: 'text-red-500', bgHover: 'hover:bg-red-500/10', border: 'border-red-500/20' },
  hard: { color: 'text-orange-500', bgHover: 'hover:bg-orange-500/10', border: 'border-orange-500/20' },
  good: { color: 'text-emerald-500', bgHover: 'hover:bg-emerald-500/10', border: 'border-emerald-500/20' },
  easy: { color: 'text-blue-500', bgHover: 'hover:bg-blue-500/10', border: 'border-blue-500/20' },
};

interface RatingButtonsProps {
  intervals: Record<number, string> | null;
  onRate: (rating: number) => void;
  disabled?: boolean;
}

function RatingButtons({ intervals, onRate, disabled }: RatingButtonsProps) {
  if (!intervals) return null;

  const buttons = [
    { key: 'again', label: 'Otra vez', rating: 1, interval: intervals?.[1] },
    { key: 'hard', label: 'Difícil', rating: 2, interval: intervals?.[2] },
    { key: 'good', label: 'Bien', rating: 3, interval: intervals?.[3] },
    { key: 'easy', label: 'Fácil', rating: 4, interval: intervals?.[4] },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 w-full mt-4">
      {buttons.map((btn) => {
        const style = RATING_STYLES[btn.key as keyof typeof RATING_STYLES];
        return (
          <button
            key={btn.key}
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              onRate(btn.rating);
            }}
            className={`
              relative flex flex-col items-center justify-center py-3 px-2 rounded-xl
              bg-card border ${style.border} ${style.bgHover}
              transition-all duration-200 cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed
              group overflow-hidden
            `}
          >
            {/* Interval */}
            <div className={`flex items-center gap-1 text-xs opacity-70 mb-1 ${style.color}`}>
              <Clock size={12} />
              <span>{btn.interval || '...'}</span>
            </div>
            
            {/* Label */}
            <span className={`font-bold text-sm sm:text-base ${style.color}`}>
              {btn.label}
            </span>

            {/* Keyboard shortcut hint (hidden on very small screens) */}
            <span className="hidden sm:flex absolute top-1 right-1 items-center justify-center w-4 h-4 rounded text-[10px] font-mono text-muted-foreground bg-white/5 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
              {btn.rating}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default RatingButtons;
