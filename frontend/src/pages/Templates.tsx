import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { templatesApi } from '../services/api';
import { TemplateDeck } from '../types';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Loader2, Library, Download } from 'lucide-react';

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
      toast.success(`�Mazo "${newDeck.name}" importado con �xito!`);
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
        <div className="flex flex-col items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Cargando plantillas...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="card border-dashed flex flex-col items-center justify-center text-center p-12">
          <Library className="w-12 h-12 mb-4 opacity-50" />
          <h3 className="m-0 mb-2 text-xl font-bold">No hay plantillas disponibles</h3>
          <p className="text-muted-foreground m-0">Vuelve m�s tarde para ver nuevos mazos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div key={template.id} className="card flex flex-col border-dashed p-6 hover:border-[var(--accent-primary)] transition-colors">
              <div className="flex justify-between items-start mb-4 gap-3">
                <h3 className="m-0 text-xl font-bold break-words">{template.icon} {template.name}</h3>
                <Badge variant="outline" className="shrink-0">
                  {template.category}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm flex-1 mb-6 leading-relaxed">
                {template.description}
              </p>
              <div className="flex justify-between items-center mt-auto">
                <span className="text-sm font-semibold text-muted-foreground">
                  {template.cardCount} tarjetas
                </span>
                <Button 
                  onClick={() => handleImportTemplate(template.id)}
                  disabled={importingId === template.id}
                  size="sm"
                >
                  {importingId === template.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                  {importingId === template.id ? 'Importando...' : 'Descargar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}