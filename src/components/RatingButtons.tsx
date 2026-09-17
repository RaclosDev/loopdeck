function RatingButtons({ intervals, onRate, disabled }) {
  const buttons = [
    { key: 'again', label: 'Repetir', rating: 1, interval: intervals?.[1] },
    { key: 'hard', label: 'Difícil', rating: 2, interval: intervals?.[2] },
    { key: 'good', label: 'Bien', rating: 3, interval: intervals?.[3] },
    { key: 'easy', label: 'Fácil', rating: 4, interval: intervals?.[4] },
  ];

  return (
    <div className="rating-buttons">
      {buttons.map(btn => (
        <button
          key={btn.key}
          className={`rating-btn ${btn.key}`}
          onClick={() => onRate(btn.rating)}
          disabled={disabled}
        >
          <span className="rating-label">{btn.label}</span>
          <span className="rating-interval">{btn.interval || '...'}</span>
          <span className="rating-key">{btn.rating}</span>
        </button>
      ))}
    </div>
  );
}

export default RatingButtons;
