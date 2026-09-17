import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { templatesApi, decksApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

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
    <div className="animate-in fade-in pb-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Plantillas</h1>
        <p className="text-muted-foreground text-sm">Descarga mazos prediseñados para empezar a estudiar</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-t-transparent border-primary rounded-full animate-spin mb-4" />
          <p className="text-muted-foreground text-sm">Cargando plantillas...</p>
        </div>
      ) : templates.length === 0 ? (
        <Card className="bg-card flex flex-col items-center justify-center p-12 text-center border-dashed">
          <div className="text-4xl mb-3 opacity-70">📦</div>
          <h3 className="text-xl font-bold mb-2">No hay plantillas disponibles</h3>
          <p className="text-muted-foreground text-sm">Vuelve más tarde para ver nuevos mazos.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(t => (
            <Card key={t.id} className="bg-card border-dashed flex flex-col">
              <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0 gap-4">
                <CardTitle className="text-lg leading-tight">{t.icon} {t.name}</CardTitle>
                <Badge variant="outline" className="whitespace-nowrap">{t.category}</Badge>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground">{t.description}</p>
                <div className="mt-3 text-xs font-semibold bg-secondary inline-flex px-2 py-1 rounded">
                  {t.cardCount} tarjetas
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  onClick={() => handleImportTemplate(t.id)}
                  disabled={!!importingId}
                >
                  {importingId === t.id ? 'Descargando...' : '📥 Descargar Mazo'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
