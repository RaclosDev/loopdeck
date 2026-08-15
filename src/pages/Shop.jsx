import { useState } from 'react';
import useAuthStore from '../store/useAuthStore';
import useStore from '../store/useStore';
import Mascot from '../components/Mascot';
import { usersApi } from '../services/api';

const SKINS_STORE = [
  { id: 'default', name: 'Fuego Básico', cost: 0, description: 'La chispa inicial del aprendizaje.' },
  { id: 'toxic', name: 'Fuego Tóxico', cost: 100, description: 'Llama verde radiactiva.' },
  { id: 'divine', name: 'Fuego Divino', cost: 500, description: 'Resplandece con luz dorada pura.' },
  { id: 'cyber', name: 'Llama Cyber', cost: 1000, description: 'Azul neón futurista.' },
  { id: 'void', name: 'Llama del Vacío', cost: 2000, description: 'Energía oscura y misteriosa.' }
];

export default function Shop() {
  const { user, updateUser } = useAuthStore();
  const { addToast } = useStore();
  const [buying, setBuying] = useState(null);

  const handleBuy = async (skinId, cost) => {
    if (user.points < cost) {
      addToast('No tienes suficientes puntos.', 'error');
      return;
    }
    
    setBuying(skinId);
    try {
      const updatedUser = await usersApi.buySkin(skinId, cost);
      updateUser(updatedUser);
      addToast('¡Skin equipada con éxito!', 'success');
    } catch (e) {
      addToast('Error al comprar: ' + e.message, 'error');
    } finally {
      setBuying(null);
    }
  };

  if (!user) return null;

  return (
    <div className="dashboard animate-fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: 40, textAlign: 'center' }}>
        <h1>Tienda de Mascotas</h1>
        <p>Gasta tus puntos de racha en personalizar a tu mascota.</p>
        
        <div style={{ 
          marginTop: 24, 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: 16, 
          background: 'var(--surface-color)', 
          padding: '12px 24px', 
          borderRadius: 24,
          border: '1px solid var(--border-color)'
        }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffd700' }}>🪙 {user.points || 0} Puntos</span>
        </div>
      </div>

      <div className="decks-grid">
        {SKINS_STORE.map(skin => {
          const isEquipped = user.mascot === skin.id || (!user.mascot && skin.id === 'default');
          
          return (
            <div key={skin.id} className="deck-card" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              textAlign: 'center',
              border: isEquipped ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
              background: isEquipped ? 'rgba(var(--accent-color-rgb), 0.05)' : 'var(--surface-color)'
            }}>
              <div style={{ marginBottom: 20, marginTop: 10 }}>
                <Mascot skin={skin.id} size={100} streak={user.streak || 0} />
              </div>
              
              <h3 style={{ marginBottom: 8 }}>{skin.name}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 20, minHeight: 40 }}>
                {skin.description}
              </p>
              
              <button 
                className={isEquipped ? "glass-btn" : "primary-btn"}
                style={{ width: '100%' }}
                onClick={() => handleBuy(skin.id, skin.cost)}
                disabled={buying === skin.id || (user.points < skin.cost && !isEquipped)}
              >
                {buying === skin.id ? (
                  <span className="spinner-sm" />
                ) : isEquipped ? (
                  'Equipado'
                ) : (
                  <>🪙 {skin.cost}</>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
