import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decksApi, notesApi } from '../services/api';
import { Deck } from '../types';
import { SegmentedControl } from '../components/ui/segmented-control';
import { Button } from '../components/ui/button';
import { Save, Plus, ArrowLeft, Loader2 } from 'lucide-react';

export default function AddCard() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  
  const [deck, setDeck] = useState<Deck | null>(null);
  const [noteType, setNoteType] = useState('basic');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const decks = await decksApi.getAll();
        const d = decks.find(x => x.id === deckId);
        if (!d) {
          toast.error('Mazo no encontrado');
          navigate('/');
          return;
        }
        setDeck(d);
      } catch (e) {
        toast.error('Error al cargar');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [deckId, navigate]);

  const handleSave = async (addAnother: boolean) => {
    if (!deckId) return;
    
    const isCloze = noteType === 'cloze';
    if (isCloze && !text.trim()) {
      toast.error('El texto está vacío');
      return;
    }
    if (!isCloze && (!front.trim() || !back.trim())) {
      toast.error('Frente y dorso requeridos');
      return;
    }

    setSaving(true);
    try {
      const dto = {
        deckId,
        noteType,
        fieldsJson: JSON.stringify(isCloze ? { text } : { front, back }),
        tags
      };
      
      await notesApi.create(dto);
      toast.success('Tarjeta añadida');
      
      if (addAnother) {
        setFront('');
        setBack('');
        setText('');
      } else {
        navigate(`/study/${deckId}`);
      }
    } catch (e) {
      toast.error('Error al guardar tarjeta');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const noteTypes = [
    { value: 'basic', label: 'Básica' },
    { value: 'basic_reversed', label: 'Invertida' },
    { value: 'cloze', label: 'Huecos (Cloze)' }
  ];

  return (
    <div className="fade-in pb-12">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold m-0">Añadir Tarjeta</h2>
          <div className="text-sm text-muted-foreground">{deck?.name}</div>
        </div>
      </div>

      <div className="card mb-6">
        <label className="form-label mb-3 block uppercase tracking-wide text-xs">Tipo de Nota</label>
        <SegmentedControl
          options={noteTypes}
          value={noteType}
          onChange={setNoteType}
          className="mb-2"
        />
        <div className="text-xs text-muted-foreground mt-2">
          {noteType === 'basic' && 'Una tarjeta simple con anverso y reverso.'}
          {noteType === 'basic_reversed' && 'Crea dos tarjetas: una normal y otra invertida (reverso → anverso).'}
          {noteType === 'cloze' && 'Oculta partes del texto. Usa {{c1::palabra}} para crear huecos.'}
        </div>
      </div>

      <div className="card mb-6 flex flex-col gap-5">
        {noteType === 'cloze' ? (
          <div>
            <label className="form-label mb-2 block uppercase tracking-wide text-xs">Texto (Usa {'{{c1::texto}}'})</label>
            <div 
              className="form-input min-h-[120px] p-3 text-[1rem]" 
              contentEditable 
              dangerouslySetInnerHTML={{ __html: text }}
              onInput={e => setText(e.currentTarget.innerHTML)} 
            />
          </div>
        ) : (
          <>
            <div>
              <label className="form-label mb-2 block uppercase tracking-wide text-xs">Frente</label>
              <div 
                className="form-input min-h-[80px] p-3 text-[1rem]" 
                contentEditable 
                dangerouslySetInnerHTML={{ __html: front }}
                onInput={e => setFront(e.currentTarget.innerHTML)} 
              />
            </div>
            <div>
              <label className="form-label mb-2 block uppercase tracking-wide text-xs">Dorso</label>
              <div 
                className="form-input min-h-[80px] p-3 text-[1rem]" 
                contentEditable 
                dangerouslySetInnerHTML={{ __html: back }}
                onInput={e => setBack(e.currentTarget.innerHTML)} 
              />
            </div>
          </>
        )}

        <div>
          <label className="form-label mb-2 block uppercase tracking-wide text-xs">Etiquetas (separadas por coma)</label>
          <input 
            type="text"
            className="form-input w-full"
            placeholder="ej: javascript, frontend, react"
            value={tags}
            onChange={e => setTags(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1 py-6 rounded-xl text-base" onClick={() => handleSave(true)} disabled={saving}>
          {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
          Añadir y Crear Otra
        </Button>
        <Button className="flex-1 py-6 rounded-xl text-base" onClick={() => handleSave(false)} disabled={saving}>
          {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
          Guardar y Estudiar
        </Button>
      </div>
    </div>
  );
}