import React from 'react';
import useFarmStore from '../store/useFarmStore';

function SeedChoiceModal({ onClose, selectedPlotIndex }) {
  const { availableCrops, plantSeed } = useFarmStore();
  const [planting, setPlanting] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState(null);

  const handlePlant = async () => {
    if (planting || !selectedId) return;
    setPlanting(true);
    try {
      await plantSeed(selectedPlotIndex, selectedId);
      onClose();
    } catch (e) {
      console.error(e);
      setPlanting(false);
    }
  };

  return (
    <div className="seed-modal-overlay">
      <div className="seed-modal">
        <h2 style={{ color: 'var(--text-main)', textAlign: 'center', margin: '0 0 1rem 0' }}>
          🌱 ¿Qué te apetece plantar?
        </h2>
        <p style={{ color: 'var(--text-dim)', textAlign: 'center' }}>
          Elige una semilla. Crecerá pasivamente mientras estudias.
        </p>

        <div className="seed-grid">
          {availableCrops.filter(c => c.unlocked).map(c => (
            <button 
              key={c.id} 
              className={`seed-btn ${selectedId === c.id ? 'selected' : ''}`}
              onClick={() => setSelectedId(c.id)}
            >
              <span className="seed-emoji">{c.emoji}</span>
              <span className="seed-name">{c.name}</span>
            </button>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button className="glass-btn" onClick={handlePlant} disabled={planting || !selectedId}>
            Plantar
          </button>
          <button className="glass-btn" onClick={onClose} disabled={planting}>
            Ahora no, más tarde
          </button>
        </div>
      </div>
    </div>
  );
}

export default SeedChoiceModal;
