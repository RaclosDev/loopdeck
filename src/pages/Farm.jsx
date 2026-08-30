import React, { useEffect, useState } from 'react';
import useFarmStore from '../store/useFarmStore';
import useAuthStore from '../store/useAuthStore';
import FarmGrid from '../components/FarmGrid';
import FarmSummaryBanner from '../components/FarmSummaryBanner';
import SeedChoiceModal from '../components/SeedChoiceModal';
import FarmInfoModal from '../components/FarmInfoModal';
import './Farm.css';

function Farm() {
  const { farm, loading, error, fetchFarm, fetchAvailableCrops } = useFarmStore();
  const { user } = useAuthStore();
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedPlotIndex, setSelectedPlotIndex] = useState(null);

  useEffect(() => {
    if (user) {
      const load = async () => {
        await fetchFarm();
        await fetchAvailableCrops();
      };
      load();
    }
  }, [user, fetchFarm, fetchAvailableCrops]);

  if (error) {
    return (
      <div className="farm-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: 'var(--danger-color)' }}>
        <div>Error al cargar la granja: {error}</div>
      </div>
    );
  }

  if (loading || !farm) {
    return (
      <div className="farm-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ color: 'var(--text-dim)' }}>Cargando granja... <span className="spinner-sm" style={{marginLeft: '10px'}} /></div>
      </div>
    );
  }

  const handlePlotClick = (plot) => {
    if (plot.status === 'empty' && farm.pendingSeeds > 0) {
      setSelectedPlotIndex(plot.index);
      setShowSeedModal(true);
    }
  };

  return (
    <div className="farm-container fade-in">
      {/* HEADER */}
      <div className="farm-header glass-panel">
        <div className="farm-header-title">
          <span className="emoji-icon">🧑‍🌾</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h1>Mi Granja</h1>
              <button 
                className="glass-btn" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                onClick={() => setShowInfoModal(true)}
              >
                ℹ️ Cómo funciona
              </button>
            </div>
            <p>{farm.totalPlotsUnlocked} parcelas desbloqueadas. La granja crece sola mientras estudias.</p>
          </div>
        </div>
        
        <div className="farm-stats">
          <div className="stat-badge">
            <span className="stat-icon">☀️</span>
            <div className="stat-info">
              <span className="stat-label">Luz</span>
              <span className="stat-value">{farm.lightPoints}</span>
            </div>
          </div>
          <div className="stat-badge">
            <span className="stat-icon">🌱</span>
            <div className="stat-info">
              <span className="stat-label">Semillas</span>
              <span className="stat-value">{farm.pendingSeeds}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="farm-content-grid">
        {/* LEFT COLUMN: VISUAL FARM */}
        <div className="farm-scene-wrapper glass-panel">
          <FarmGrid plots={farm.plots} onPlotClick={handlePlotClick} />
          {farm.summary && <FarmSummaryBanner summary={farm.sinceLastVisit} />}
        </div>

        {/* RIGHT COLUMN: REWARDS / MILESTONES (Optional placeholder) */}
        <div className="farm-info-panel">
          <div className="glass-panel" style={{height: '100%', padding: 'var(--spacing-xl)', display: 'flex', flexDirection: 'column'}}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Progreso</h3>
            <p style={{color: 'var(--text-dim)', fontSize: '0.95rem', lineHeight: '1.5'}}>
              Estudia tarjetas y completa mazos para desbloquear nuevas parcelas, cultivos y decoraciones.
            </p>
            {farm.pendingSeeds > 0 && (
              <div className="seed-alert">
                ¡Tienes {farm.pendingSeeds} semilla(s) pendiente(s)! Toca una parcela vacía para plantar.
              </div>
            )}
          </div>
        </div>
      </div>

      {showSeedModal && (
        <SeedChoiceModal 
          onClose={() => setShowSeedModal(false)} 
          selectedPlotIndex={selectedPlotIndex}
        />
      )}

      {showInfoModal && (
        <FarmInfoModal onClose={() => setShowInfoModal(false)} />
      )}
    </div>
  );
}

export default Farm;
