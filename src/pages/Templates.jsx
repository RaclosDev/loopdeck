import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { templatesApi } from '../services/api';

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importingId, setImportingId] = useState(null);
  const navigate = useNavigate();
  const { addToast } = useStore();

  useEffect(() => {
    templatesApi.getAll()
      .then(data => setTemplates(data))
      .catch(() => addToast('Error cargando plantillas', 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  const handleImportTemplate = async (templateId) => {
    setImportingId(templateId);
    try {
      await templatesApi.import(templateId);
      addToast('Plantilla importada con éxito', 'success');
      navigate('/');
    } catch (e) {
      addToast('Error importando plantilla: ' + e.message, 'error');
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ marginBottom: 28 }}>
        <h1>Plantillas Disponibles</h1>
        <p>Descarga mazos prediseñados para empezar a estudiar al instante.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="spinner-sm" style={{ width: 40, height: 40, margin: '0 auto 16px', borderWidth: 3 }} />
            <p style={{ color: 'var(--text-muted)' }}>Cargando plantillas...</p>
          </div>
        </div>
      ) : templates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          No hay plantillas disponibles en este momento.
        </div>
      ) : (
        <div className="decks-grid" style={{ marginBottom: 40 }}>
          {templates.map(t => (
            <div key={t.id} className="deck-card" style={{ border: '1px dashed var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
              <div className="deck-card-header" style={{ alignItems: 'flex-start' }}>
                <span className="deck-card-name" style={{ lineHeight: 1.2 }}>{t.icon} {t.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', padding: '2px 8px', background: 'var(--surface-color)', borderRadius: 12, whiteSpace: 'nowrap' }}>{t.category}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 16, minHeight: 40 }}>
                {t.description} ({t.cardCount} tarjetas)
              </div>
              <button 
                className="primary-btn" 
                style={{ width: '100%' }}
                onClick={() => handleImportTemplate(t.id)}
                disabled={importingId === t.id}
              >
                {importingId === t.id ? <span className="spinner-sm" /> : '📥 Descargar Mazo'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
