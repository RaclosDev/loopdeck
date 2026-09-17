import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decksApi, notesApi } from '../services/api';
import useStore from '../store/useStore';

export default function AddCard() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useStore();
  
  const [decks, setDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState(deckId || '');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [noteType, setNoteType] = useState('basic');

  useEffect(() => {
    decksApi.getAll().then(data => {
      setDecks(data);
      if (data.length > 0 && !selectedDeck) {
        setSelectedDeck(data[0].id);
      }
      setLoading(false);
    });
  }, [selectedDeck]);

  const handleSave = async () => {
    if (!front.trim() || !back.trim()) {
      addToast('El frente y el dorso son obligatorios', 'error');
      return;
    }
    if (!selectedDeck) {
      addToast('Selecciona un mazo', 'error');
      return;
    }

    setSaving(true);
    try {
      const fieldsJson = JSON.stringify({ front, back });
      await notesApi.create({
        deckId: selectedDeck,
        noteType,
        fieldsJson,
        tags
      });
      addToast('Tarjeta añadida', 'success');
      setFront('');
      setBack('');
    } catch (e) {
      addToast('Error al guardar: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="fade-in pb-10">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1>Añadir Tarjeta</h1>
        <p>Crea nuevas tarjetas para estudiar</p>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>MAZO</label>
            <select 
              className="form-input" 
              value={selectedDeck} 
              onChange={e => setSelectedDeck(e.target.value)}
              style={{ width: '100%', height: '42px' }}
            >
              {decks.length === 0 && <option value="">No hay mazos</option>}
              {decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>TIPO</label>
            <select 
              className="form-input" 
              value={noteType} 
              onChange={e => setNoteType(e.target.value)}
              style={{ width: '100%', height: '42px' }}
            >
              <option value="basic">Básica (1 tarjeta)</option>
              <option value="reverse">Inversa (2 tarjetas)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
            FRENTE (PREGUNTA)
          </label>
          <div 
            className="form-input" 
            style={{ minHeight: '120px', padding: '12px', fontSize: '1rem', lineHeight: 1.5, background: 'var(--bg-card)' }}
            contentEditable 
            onInput={e => setFront(e.currentTarget.innerHTML)}
            dangerouslySetInnerHTML={{ __html: front }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
            DORSO (RESPUESTA)
          </label>
          <div 
            className="form-input" 
            style={{ minHeight: '120px', padding: '12px', fontSize: '1rem', lineHeight: 1.5, background: 'var(--bg-card)' }}
            contentEditable 
            onInput={e => setBack(e.currentTarget.innerHTML)}
            dangerouslySetInnerHTML={{ __html: back }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
            ETIQUETAS (separadas por coma)
          </label>
          <input 
            type="text" 
            className="form-input" 
            value={tags} 
            onChange={e => setTags(e.target.value)} 
            placeholder="ej. historia, s18, importante"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button 
          className="btn btn-secondary" 
          style={{ flex: 1 }}
          onClick={() => navigate('/')}
        >
          Cancelar
        </button>
        <button 
          className="btn btn-primary" 
          style={{ flex: 2 }}
          onClick={handleSave}
          disabled={saving || !selectedDeck}
        >
          {saving ? 'Guardando...' : 'Añadir Tarjeta'}
        </button>
      </div>
    </div>
  );
}

