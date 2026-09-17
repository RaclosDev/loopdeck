import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { templatesApi } from '../services/api';

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importingId, setImportingId] = useState(null);
  const { addToast } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    templatesApi.getAll()
      .then(data => {
        setTemplates(data);
        setLoading(false);
      })
      .catch(() => {
        addToast('Error al cargar plantillas', 'error');
        setLoading(false);
      });
  }, [addToast]);

  const handleImportTemplate = async (templateId) => {
    if (importingId) return;
    setImportingId(templateId);
    try {
      const newDeck = await templatesApi.import(templateId);
      addToast(`¡Mazo "${newDeck.name}" importado con éxito!`, 'success');
      navigate('/');
    } catch (e) {
      addToast('Error al importar la plantilla', 'error');
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="fade-in pb-10">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1>📦 Plantillas</h1>
        <p>Descarga mazos prediseñados para empezar a estudiar</p>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="spinner" />
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Cargando plantillas...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', borderStyle: 'dashed' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📦</div>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>No hay plantillas disponibles</h3>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Vuelve más tarde para ver nuevos mazos.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {templates.map(t => (
            <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column', borderStyle: 'dashed', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{t.icon} {t.name}</h3>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                  {t.category}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', flex: 1, marginBottom: '1rem', lineHeight: 1.5 }}>
                {t.description}
              </p>
              <div style={{ background: 'var(--bg-glass)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, width: 'fit-content', marginBottom: '1.5rem' }}>
                {t.cardCount} tarjetas
              </div>
              <button 
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.875rem', borderRadius: '12px' }}
                onClick={() => handleImportTemplate(t.id)}
                disabled={!!importingId}
              >
                {importingId === t.id ? 'Descargando...' : '📥 Descargar Mazo'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

