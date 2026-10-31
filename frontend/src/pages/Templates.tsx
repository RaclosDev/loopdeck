import toast from 'react-hot-toast';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { templatesApi } from '../services/api';
import { TemplateDeck } from '../types';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Loader2, Library, Download, Map, Globe, Flag, BookOpen, AlertCircle } from 'lucide-react';

function getCategoryIcon(icon?: string, category?: string) {
  switch ((icon || category)?.toLowerCase()) {
    case 'map':
      return <Map className="w-5 h-5 text-[var(--accent-primary)]" />;
    case 'globe':
      return <Globe className="w-5 h-5 text-[var(--accent-primary)]" />;
    case 'flag':
      return <Flag className="w-5 h-5 text-[var(--accent-primary)]" />;
    default:
      return <BookOpen className="w-5 h-5 text-[var(--accent-primary)]" />;
  }
}

export default function Templates() {
  const navigate = useNavigate();
  const [importingId, setImportingId] = useState<string | null>(null);

  const {
    data: templates = [],
    isLoading: loading,
    isError,
    refetch,
  } = useQuery<TemplateDeck[]>({
    queryKey: ['templates'],
    queryFn: () => templatesApi.getAll(),
    staleTime: 10 * 60 * 1000,
  });

  const handleImportTemplate = async (templateId: string) => {
    if (importingId) return;
    setImportingId(templateId);
    try {
      const newDeck = await templatesApi.import(templateId);
      toast.success(`¡Mazo "${newDeck.name}" importado con éxito!`);
      navigate('/');
    } catch {
      toast.error('Error al importar la plantilla');
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="fade-in pb-10">
      {isError ? (
        <div className="card border-dashed flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
          <AlertCircle className="w-12 h-12 text-destructive opacity-80" />
          <p className="text-foreground font-medium">Error al cargar las plantillas</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card p-6 flex flex-col gap-4 border-dashed">
              <Skeleton className="h-6 w-3/4 rounded-md" />
              <Skeleton className="h-16 w-full rounded-md" />
              <div className="flex justify-between items-center mt-auto">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="card border-dashed flex flex-col items-center justify-center text-center p-12">
          <Library className="w-12 h-12 mb-4 opacity-50" />
          <h2 className="m-0 mb-2 text-xl font-bold">No hay plantillas disponibles</h2>
          <p className="text-muted-foreground m-0">Vuelve más tarde para ver nuevos mazos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="card flex flex-col border-dashed p-6 hover:border-[var(--accent-primary)] transition-colors"
            >
              <div className="flex justify-between items-start mb-4 gap-3">
                <h2 className="m-0 text-xl font-bold break-words flex items-center gap-2">
                  {getCategoryIcon(template.icon, template.category)} <span>{template.name}</span>
                </h2>
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
                  {importingId === template.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
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
