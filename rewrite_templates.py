import re

with open('src/pages/Templates.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace return block

new_file = '''import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { templatesApi } from '../services/api';
import { TemplateDeck } from '../types';

export default function Templates() {
  const [templates, setTemplates] = useState<TemplateDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [importingId, setImportingId] = useState<string | null>(null);
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

  const handleImportTemplate = async (templateId: string) => {
    if (importingId) return;
    setImportingId(templateId);
    try {
      const newDeck = await templatesApi.import(templateId);
      addToast(¡Mazo "" importado con éxito!, 'success');
      navigate('/');
    } catch (e) {
      addToast('Error al importar la plantilla', 'error');
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="fade-in pb-12">
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="spinner" />
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Cargando plantillas...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', borderStyle: 'dashed' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📚</div>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>No hay plantillas disponibles</h3>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Vuelve más tarde para ver nuevos mazos.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {templates.map((template) => (
            <div key={template.id} className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{template.icon} {template.name}</h3>
                <span className="filter-chip" style={{ cursor: 'default', background: 'var(--bg-card)', padding: '0.2rem 0.6rem', fontSize: '0.75rem', border: '1px solid var(--border-medium)' }}>
                  {template.category}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', flex: 1, marginBottom: '1.25rem', lineHeight: 1.5 }}>
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
'''

with open('src/pages/Templates.tsx', 'w', encoding='utf-8') as f:
    f.write(new_file)
