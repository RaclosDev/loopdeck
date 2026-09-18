import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { templatesApi } from '../services/api';
import { TemplateDeck } from '../types';

export default function Templates() {
  const [templates, setTemplates] = useState<TemplateDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [importingId, setImportingId] = useState<string | null>(null);
    const navigate = useNavigate();

  useEffect(() => {
    templatesApi.getAll()
      .then(data => {
        setTemplates(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Error al cargar plantillas');
        setLoading(false);
      });
  }, []);

  const handleImportTemplate = async (templateId: string) => {
    if (importingId) return;
    setImportingId(templateId);
    try {
      const newDeck = await templatesApi.import(templateId);
      toast.success(`¡Mazo "${newDeck.name}" importado con éxito!`);
      navigate('/');
    } catch (e) {
      toast.error('Error al importar la plantilla');
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="fade-in pb-10">
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="spinner" />
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Cargando plantillas...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', borderStyle: 'dashed' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📦</div>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>No hay plantillas disponibles</h3>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Vuelve más tarde para ver nuevos mazos.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {templates.map((template) => (
            <div key={template.id} className="card" style={{ display: 'flex', flexDirection: 'column', borderStyle: 'dashed', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{template.icon} {template.name}</h3>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                  {template.category}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', flex: 1, marginBottom: '1rem', lineHeight: 1.5 }}>
                {template.description}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {template.cardCount} tarjetas
                </span>
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleImportTemplate(template.id)}
                  disabled={importingId === template.id}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                >
                  {importingId === template.id ? 'Importando...' : 'Descargar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


