import React from 'react';
import './FarmInfoModal.css';

function FarmInfoModal({ onClose }) {
  return (
    <div className="farm-info-modal-overlay" onClick={onClose}>
      <div className="farm-info-modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>
        
        <h2>👨‍🌾 Cómo funciona tu Granja Pasiva</h2>
        
        <div className="farm-info-section">
          <h3>🌱 Semillas</h3>
          <p>Obtienes semillas automáticamente al desbloquear logros y estudiar en LoopDeck. Planta una semilla en una parcela vacía tocándola.</p>
        </div>

        <div className="farm-info-section">
          <h3>☀️ Luz (Progreso)</h3>
          <p>Tus plantas no necesitan que estés pendiente. Crecen solas acumulando <strong>Luz</strong> cada vez que repasas tarjetas. Cuantas más tarjetas estudies, más luz ganarán tus plantas.</p>
        </div>

        <div className="farm-info-section">
          <h3>🧺 Cosechas</h3>
          <p>Cuando una planta madura, puedes cosecharla tocándola, ¡pero no te preocupes si no entras! No se marchitan nunca, te estarán esperando.</p>
        </div>

        <div className="farm-info-section">
          <h3>🚜 Parcelas nuevas</h3>
          <p>Al dominar mazos enteros y acumular rachas de estudio, desbloquearás más espacio en tu granja de forma automática.</p>
        </div>

        <button className="primary-btn" onClick={onClose} style={{width: '100%', marginTop: '1rem'}}>
          ¡Entendido!
        </button>
      </div>
    </div>
  );
}

export default FarmInfoModal;
