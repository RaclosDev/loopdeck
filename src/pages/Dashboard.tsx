import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import Modal from '../components/Modal';
import useStore from '../store/useStore';
import { decksApi, studyApi, templatesApi, notesApi } from '../services/api';

function Dashboard() {
  const [decks, setDecks] = useState([]);
  const [deckCounts, setDeckCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showNewDeck, setShowNewDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDesc, setNewDeckDesc] = useState('');
  const [editingDeck, setEditingDeck] = useState(null);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [importingId, setImportingId] = useState(null);
  const navigate = useNavigate();
  const { addToast } = useStore();
  const fileInputRef = useRef(null);
  const [importTargetDeck, setImportTargetDeck] = useState(null);

  const loadDecks = useCallback(async () => {
    try {
      const [data, templatesData] = await Promise.all([
        decksApi.getAll(),
        templatesApi.getAll().catch(() => [])
      ]);
      setDecks(data);
      setTemplates(templatesData);
      
      const countResults = await Promise.allSettled(
        data.map(d => studyApi.getDueCards(d.id, 1000).then(cards => ({ id: d.id, cards })))
      );
      const counts = {};
      countResults.forEach(r => {
        if (r.status === 'fulfilled') {
          const { id, cards } = r.value;
          const now = new Date();
          counts[id] = {
            new: cards.filter(c => c.card.state === 'new').length,
            learning: cards.filter(c => (c.card.state === 'learning' || c.card.state === 'relearning') && new Date(c.card.due) <= now).length,
            review: cards.filter(c => c.card.state === 'review' && new Date(c.card.due) <= now).length,
            total: cards.length,
          };
        }
      });
      setDeckCounts(counts);
    } catch (e) {
      addToast('Error cargando mazos: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadDecks(); }, [loadDecks]);

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) return;
    setSaving(true);
    try {
      await decksApi.create({ name: newDeckName.trim(), description: newDeckDesc.trim() });
      setShowNewDeck(false);
      setNewDeckName('');
      setNewDeckDesc('');
      loadDecks();
    } catch (e) {
      addToast('Error al crear mazo', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDeck = async () => {
    if (!newDeckName.trim() || !editingDeck) return;
    setSaving(true);
    try {
      await decksApi.update(editingDeck.id, { name: newDeckName.trim(), description: newDeckDesc.trim() });
      setEditingDeck(null);
      setNewDeckName('');
      setNewDeckDesc('');
      loadDecks();
    } catch (e) {
      addToast('Error al editar mazo', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDeck = async (deck) => {
    if (window.confirm(`¿Seguro que quieres eliminar el mazo "${deck.name}" y todas sus tarjetas?`)) {
      try {
        await decksApi.delete(deck.id);
        loadDecks();
      } catch (e) {
        addToast('Error al eliminar mazo', 'error');
      }
    }
  };

  const handleImportTemplate = async (templateId) => {
    setImportingId(templateId);
    try {
      await templatesApi.import(templateId);
      addToast('Plantilla importada con éxito', 'success');
      loadDecks();
    } catch (e) {
      addToast('Error importando plantilla: ' + e.message, 'error');
    } finally {
      setImportingId(null);
    }
  };

  const handleExportDeck = async (deck) => {
    try {
      const notes = await notesApi.getByDeck(deck.id);
      if (notes.length === 0) {
        addToast('El mazo está vacío', 'error');
        return;
      }
      const exportData = notes.map(n => ({
        noteType: n.noteType,
        fieldsJson: n.fieldsJson,
        tags: n.tags
      }));
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${deck.name.replace(/\s+/g, '_')}_export.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      addToast(`Mazo "${deck.name}" exportado`, 'success');
    } catch (e) {
      addToast('Error exportando: ' + e.message, 'error');
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !importTargetDeck) return;
    
    try {
      const text = await file.text();
      const items = JSON.parse(text);
      if (!Array.isArray(items)) throw new Error("Formato inválido");
      
      let successCount = 0;
      for (const item of items) {
        if (!item.noteType || !item.fieldsJson) continue;
        await notesApi.create({
          deckId: importTargetDeck.id,
          noteType: item.noteType,
          fieldsJson: item.fieldsJson,
          tags: item.tags || ''
        });
        successCount++;
      }
      addToast(`${successCount} notas importadas a "${importTargetDeck.name}"`, 'success');
      loadDecks();
    } catch (err) {
      addToast('Error importando: ' + err.message, 'error');
    } finally {
      e.target.value = '';
      setImportTargetDeck(null);
    }
  };

  const getCounts = (id) => deckCounts[id] || { new: 0, learning: 0, review: 0, total: 0 };
  const getTotalDue = (c) => c.learning + c.review;

  const totalNew = Object.values(deckCounts).reduce((s, c) => s + c.new, 0);
  const totalLearning = Object.values(deckCounts).reduce((s, c) => s + c.learning, 0);
  const totalReview = Object.values(deckCounts).reduce((s, c) => s + c.review, 0);
  const totalCards = Object.values(deckCounts).reduce((s, c) => s + c.total, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-t-transparent border-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando mazos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in pb-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Mis Mazos</h1>
        <p className="text-muted-foreground text-sm">
          {decks.length === 0
            ? 'Crea tu primer mazo para empezar a estudiar'
            : `${decks.length} mazo${decks.length !== 1 ? 's' : ''} • ${totalNew + totalLearning + totalReview} pendientes hoy`
          }
        </p>
      </div>

      <input 
        type="file" 
        accept=".json" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
      />

      {/* Today's Summary */}
      {decks.length > 0 && (totalNew + totalLearning + totalReview) > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-8">
          <Card className="bg-card">
            <CardContent className="p-4 flex flex-col items-center">
              <div className="text-2xl font-bold text-blue-500">{totalNew}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mt-1">Nuevas</div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-4 flex flex-col items-center">
              <div className="text-2xl font-bold text-amber-500">{totalLearning}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mt-1">Aprendiendo</div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-4 flex flex-col items-center">
              <div className="text-2xl font-bold text-emerald-500">{totalReview}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mt-1">Revisión</div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-4 flex flex-col items-center">
              <div className="text-2xl font-bold text-foreground">{totalCards}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mt-1">Total</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Decks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {decks.map(deck => {
          const counts = getCounts(deck.id);
          const due = getTotalDue(counts);
          const progress = counts.total > 0 ? ((counts.total - counts.new) / counts.total) * 100 : 0;

          return (
            <Card key={deck.id} className="flex flex-col bg-card overflow-hidden">
              <CardHeader className="p-5 pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg leading-tight">{deck.name}</CardTitle>
                  <div className="flex gap-1 ml-2">
                    <Button variant="ghost" size="icon-sm" className="h-7 w-7" onClick={() => setEditingDeck(deck)} title="Editar">✏️</Button>
                    <Button variant="ghost" size="icon-sm" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteDeck(deck)} title="Eliminar">🗑️</Button>
                  </div>
                </div>
                {deck.description && <CardDescription className="line-clamp-2">{deck.description}</CardDescription>}
              </CardHeader>
              
              <CardContent className="p-5 py-2 flex-1">
                <div className="flex justify-between text-center gap-2 mb-4">
                  <div className="flex flex-col flex-1 bg-blue-500/10 rounded-lg py-2">
                    <span className="text-blue-500 font-bold text-lg">{counts.new}</span>
                    <span className="text-[10px] uppercase text-muted-foreground">Nuevas</span>
                  </div>
                  <div className="flex flex-col flex-1 bg-amber-500/10 rounded-lg py-2">
                    <span className="text-amber-500 font-bold text-lg">{counts.learning}</span>
                    <span className="text-[10px] uppercase text-muted-foreground">Aprender</span>
                  </div>
                  <div className="flex flex-col flex-1 bg-emerald-500/10 rounded-lg py-2">
                    <span className="text-emerald-500 font-bold text-lg">{counts.review}</span>
                    <span className="text-[10px] uppercase text-muted-foreground">Revisión</span>
                  </div>
                </div>
                
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </CardContent>

              <CardFooter className="p-5 pt-3 flex gap-2">
                <Button 
                  className="flex-1" 
                  onClick={() => navigate(`/study/${deck.id}`)}
                  disabled={due === 0 && counts.new === 0}
                  variant={due > 0 || counts.new > 0 ? 'default' : 'secondary'}
                >
                  {due > 0 || counts.new > 0 ? `Responder (${due})` : 'Al día ✅'}
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigate(`/add/${deck.id}`)} title="Añadir tarjetas">
                  ➕
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigate(`/hub/${deck.id}`)} title="Opciones">
                  ⚙️
                </Button>
              </CardFooter>
            </Card>
          );
        })}

        {/* Add Deck Card */}
        <Card 
          className="flex flex-col items-center justify-center p-6 border-dashed border-2 cursor-pointer hover:bg-secondary/50 transition-colors min-h-[200px]"
          onClick={() => setShowNewDeck(true)}
        >
          <div className="text-4xl mb-3 opacity-80">➕</div>
          <div className="font-semibold text-lg">Nuevo Mazo</div>
          <p className="text-sm text-muted-foreground text-center mt-1">Crea una nueva colección de tarjetas</p>
        </Card>
      </div>

      {/* Templates Section */}
      {templates.length > 0 && decks.length < 3 && (
        <div className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold tracking-tight">Plantillas Disponibles</h2>
            <p className="text-sm text-muted-foreground">Descarga mazos prediseñados para empezar al instante.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(t => (
              <Card key={t.id} className="bg-secondary/30 border-dashed">
                <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{t.icon} {t.name}</CardTitle>
                    <Badge variant="outline" className="mt-1">{t.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm text-muted-foreground mb-4">{t.description} ({t.cardCount} tarjetas)</p>
                  <Button 
                    className="w-full" 
                    variant="secondary"
                    onClick={() => handleImportTemplate(t.id)}
                    disabled={importingId === t.id}
                  >
                    {importingId === t.id ? 'Importando...' : 'Descargar Plantilla'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal
        isOpen={showNewDeck}
        onClose={() => { setShowNewDeck(false); setNewDeckName(''); setNewDeckDesc(''); }}
        title="Nuevo Mazo"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button variant="ghost" onClick={() => setShowNewDeck(false)}>Cancelar</Button>
            <Button onClick={handleCreateDeck} disabled={!newDeckName.trim() || saving}>
              {saving ? 'Creando...' : 'Crear Mazo'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Nombre</label>
            <input
              type="text"
              className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={newDeckName}
              onChange={e => setNewDeckName(e.target.value)}
              placeholder="Ej: Inglés B2, Historia, etc."
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Descripción (Opcional)</label>
            <input
              type="text"
              className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={newDeckDesc}
              onChange={e => setNewDeckDesc(e.target.value)}
              placeholder="Breve descripción del mazo"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!editingDeck}
        onClose={() => { setEditingDeck(null); setNewDeckName(''); setNewDeckDesc(''); }}
        title="Editar Mazo"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button variant="ghost" onClick={() => setEditingDeck(null)}>Cancelar</Button>
            <Button onClick={handleUpdateDeck} disabled={!newDeckName.trim() || saving}>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Nombre</label>
            <input
              type="text"
              className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={newDeckName}
              onChange={e => setNewDeckName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Descripción</label>
            <input
              type="text"
              className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={newDeckDesc}
              onChange={e => setNewDeckDesc(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Dashboard;
