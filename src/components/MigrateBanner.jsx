import { useState } from 'react';
import { authApi } from '../services/api';
import useStore from '../store/useStore';

export default function MigrateBanner() {
  const [showForm, setShowForm] = useState(false);
  const [oldEmail, setOldEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('ff_migrate_dismissed') === 'true'
  );
  const { addToast } = useStore();

  if (dismissed) return null;

  const handleMigrate = async (e) => {
    e.preventDefault();
    if (!oldEmail.trim()) return;
    setLoading(true);
    try {
      const result = await authApi.migrateAccount(oldEmail.trim());
      addToast(`✅ ¡Migración completada! Se importaron ${result.decks} mazos y ${result.notes} tarjetas de ${result.oldEmail}`, 'success');
      setShowForm(false);
      setDismissed(true);
      localStorage.setItem('ff_migrate_dismissed', 'true');
      // Reload to show imported decks
      window.location.reload();
    } catch (err) {
      addToast(`❌ ${err.message || 'Error al migrar'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('ff_migrate_dismissed', 'true');
  };

  return (
    <div className="migrate-banner glass-panel" style={{
      margin: '0 0 1.5rem 0',
      padding: '1rem 1.25rem',
      borderLeft: '4px solid var(--accent, #8b5cf6)',
      position: 'relative'
    }}>
      <button
        onClick={handleDismiss}
        style={{
          position: 'absolute', top: '8px', right: '12px',
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
          cursor: 'pointer', fontSize: '1.2rem', padding: '4px'
        }}
        title="Cerrar"
      >×</button>

      {!showForm ? (
        <div>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>
            🔄 <strong>¿Tenías una cuenta anterior?</strong> Importa todos tus mazos y tarjetas a tu nueva cuenta de Google.
          </p>
          <button
            className="glass-btn"
            onClick={() => setShowForm(true)}
            style={{ fontSize: '0.85rem' }}
          >
            Importar desde cuenta anterior
          </button>
        </div>
      ) : (
        <form onSubmit={handleMigrate}>
          <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
            Introduce el email de tu cuenta anterior. Todos sus mazos y tarjetas se moverán aquí.
          </p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="email"
              value={oldEmail}
              onChange={(e) => setOldEmail(e.target.value)}
              placeholder="email@anterior.com"
              className="form-input"
              style={{ flex: 1, minWidth: '200px', padding: '0.5rem 0.75rem' }}
              required
            />
            <button
              type="submit"
              className="primary-btn"
              disabled={loading}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              {loading ? '⏳ Migrando...' : '🚀 Migrar'}
            </button>
            <button
              type="button"
              className="glass-btn"
              onClick={() => setShowForm(false)}
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
