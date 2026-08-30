import React from 'react';
import '../pages/Farm.css';

const FarmGrid = ({ plots = [], onPlotClick }) => {
  return (
    <div className="farm-grid">
      {plots.map((plot) => (
        <div
          key={plot.id || plot.index}
          className={`farm-plot ${plot.status}`}
          onClick={() => onPlotClick(plot)}
        >
          {plot.status === 'empty' && (
            <div className="plot-empty-indicator">+</div>
          )}
          {plot.status === 'growing' && (
            <div className="plot-growing-indicator">
              <span className="emoji-icon">🌱</span>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${plot.progressPercent}%` }}
                />
              </div>
            </div>
          )}
          {plot.status === 'mature' && (
            <div className="plot-mature-indicator">
              <span className="emoji-icon">{plot.emoji}</span>
              {plot.totalHarvested > 0 && (
                <span className="harvest-count">+{plot.totalHarvested}</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default FarmGrid;
