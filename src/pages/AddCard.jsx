import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { decksApi, notesApi } from '../services/api';
import { handleImagePaste } from '../utils/imageUtils';
import ImageSearchModal from '../components/ImageSearchModal';

const NOTE_TYPES = [
  { id: 'basic', name: 'Básica', description: 'Frente y dorso simple', fields: ['front', 'back'], cardsGenerated: 1 },
  { id: 'reverse', name: 'Básica + Reversa', description: 'Genera 2 tarjetas', fields: ['front', 'back'], cardsGenerated: 2 },
];

function AddCard() {
  const { deckId: paramDeckId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useStore();

  const [decks, setDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState(paramDeckId || '');
  const [selectedType, setSelectedType] = useState('basic');
  const [fields, setFields] = useState({ front: '', back: '' });
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeImageField, setActiveImageField] = useState(null); // 'front' or 'back'

  const tagInputRef = useRef(null);

  useEffect(() => {
    decksApi.getAll().then(setDecks).catch(_e => addToast('Error cargando mazos', 'error'));
  }, [addToast]);

  useEffect(() => {
    if (paramDeckId) setSelectedDeckId(paramDeckId);
  }, [paramDeckId]);

  const handleFieldChange = (fieldName) => (e) => {
    setFields(prev => ({ ...prev, [fieldName]: e.target.innerHTML }));
  };

  const handlePaste = (fieldName) => (e) => {
    handleImagePaste(e, () => {
      // Trigger update of state after paste
      setTimeout(() => {
        const els = document.querySelectorAll('.editor-content');
        const content = fieldName === 'front' ? els[0]?.innerHTML : els[1]?.innerHTML;
        if (content) setFields(prev => ({ ...prev, [fieldName]: content }));
      }, 50);
    });
  };

  const handleImageSelect = (url) => {
    if (!activeImageField) return;
    const imgHtml = `<img src="${url}" style="max-width: 100%; border-radius: 8px; margin: 8px 0;" alt="Selected image"/>`;
    
    // Append to existing content
    const newContent = (fields[activeImageField] || '') + '<br>' + imgHtml;
    setFields(prev => ({ ...prev, [activeImageField]: newContent }));
    
    // Update the DOM element directly
    const els = document.querySelectorAll('.editor-content');
    if (activeImageField === 'front' && els[0]) els[0].innerHTML = newContent;
    if (activeImageField === 'back' && els[1]) els[1].innerHTML = newContent;
    
    setActiveImageField(null);
  };

  const addTag = (tag) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) setTags(prev => [...prev, trimmed]);
    setTagInput('');
  };

  const removeTag = (tag) => setTags(prev => prev.filter(t => t !== tag));

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
    else if (e.key === 'Backspace' && !tagInput && tags.length > 0) removeTag(tags[tags.length - 1]);
  };

  const clearEditor = () => {
    setFields({ front: '', back: '' });
    setTags([]);
    document.querySelectorAll('.editor-content').forEach(el => { el.innerHTML = ''; });
  };

  const handleAdd = async (andClose = false) => {
    if (!selectedDeckId) { addToast('Selecciona un mazo', 'error'); return; }

    const hasContent = (html) => {
      if (!html) return false;
      if (html.includes('<img')) return true;
      return html.replace(/<[^>]*>/g, '').trim().length > 0;
    };

    if (!hasContent(fields.front) || !hasContent(fields.back)) { 
      addToast('El frente y el dorso deben tener algún texto o imagen', 'error'); 
      return; 
    }

    const finalTags = [...tags];
    if (tagInput.trim()) {
      const newTag = tagInput.trim().toLowerCase();
      if (!finalTags.includes(newTag)) finalTags.push(newTag);
      setTagInput('');
      setTags(finalTags);
    }

    setSaving(true);
    try {
      const fieldsJson = JSON.stringify({ front: fields.front || '', back: fields.back || '' });

      await notesApi.create({
        deckId: selectedDeckId,
        noteType: selectedType,
        fieldsJson,
        tags: finalTags.join(' '),
      });

      const numCards = selectedType === 'reverse' ? 2 : 1;
      addToast(`✅ ${numCards} tarjeta${numCards > 1 ? 's' : ''} añadida${numCards > 1 ? 's' : ''}`, 'success');
      clearEditor();

      if (andClose) navigate('/');
      else setTimeout(() => { const f = document.querySelector('.editor-content'); if (f) f.focus(); }, 100);
    } catch (e) {
      addToast('Error guardando: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleAdd(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, selectedDeckId, selectedType, tags]);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Añadir Tarjetas</h1>
      </div>

      <div className="editor-container">
        {/* Top Controls */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexDirection: 'row' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
            <label>Mazo</label>
            <select className="glass-select" value={selectedDeckId} onChange={e => setSelectedDeckId(e.target.value)}>
              <option value="">Seleccionar mazo...</option>
              {decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
            <label>Tipo de nota</label>
            <select className="glass-select" value={selectedType} onChange={e => { setSelectedType(e.target.value); clearEditor(); }}>
              {NOTE_TYPES.map(t => <option key={t.id} value={t.id}>{t.name} — {t.description}</option>)}
            </select>
          </div>
        </div>

        <div className="editor-grid">
          <div className="editor-fields">
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ margin: 0 }}>Frente (Pregunta)</label>
                <button className="glass-btn" style={{ fontSize: '0.8rem', padding: '4px 10px' }} onClick={() => setActiveImageField('front')} title="Buscar imagen en Wikipedia">
                  🖼️ Buscar Foto
                </button>
              </div>
              <div className="editor-content" contentEditable data-placeholder="Escribe la pregunta aquí... (Pega una imagen con Ctrl+V)" onInput={handleFieldChange('front')} onPaste={handlePaste('front')} style={{ borderRadius: 'var(--radius-md)' }} />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ margin: 0 }}>Dorso (Respuesta)</label>
                <button className="glass-btn" style={{ fontSize: '0.8rem', padding: '4px 10px' }} onClick={() => setActiveImageField('back')} title="Buscar imagen en Wikipedia">
                  🖼️ Buscar Foto
                </button>
              </div>
              <div className="editor-content" contentEditable data-placeholder="Escribe la respuesta aquí... (Pega una imagen con Ctrl+V)" onInput={handleFieldChange('back')} onPaste={handlePaste('back')} style={{ borderRadius: 'var(--radius-md)' }} />
            </div>

            {/* Tags */}
            <div className="form-group">
              <label>Etiquetas</label>
              <div className="tags-input-wrapper" onClick={() => tagInputRef.current?.focus()}>
                {tags.map(tag => (
                  <span key={tag} className="tag-badge">
                    {tag}
                    <span className="tag-badge-remove" onClick={() => removeTag(tag)}>×</span>
                  </span>
                ))}
                <input
                  ref={tagInputRef}
                  type="text"
                  className="tags-input"
                  placeholder={tags.length === 0 ? 'Añadir etiquetas...' : ''}
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="primary-btn" onClick={() => handleAdd(false)} style={{ flex: 1 }} disabled={saving}>
                {saving ? <span className="spinner-sm" /> : <>Añadir <span style={{ opacity: 0.6, fontSize: '0.75rem', marginLeft: 6 }}>Ctrl+Enter</span></>}
              </button>
              <button className="glass-btn" onClick={() => handleAdd(true)} disabled={saving}>
                Añadir y Cerrar
              </button>
            </div>

            {selectedType === 'reverse' && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', background: 'rgba(6,182,212,0.08)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(6,182,212,0.15)', marginTop: 12 }}>
                ℹ️ Se generarán <strong>2 tarjetas</strong>: frente→dorso y dorso→frente.
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="editor-preview">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vista Previa</div>
            <div className="editor-preview-card glass-panel">
              <div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: 6, fontWeight: 600 }}>FRENTE</div>
                  <div className="flashcard-content" style={{ fontSize: '1.1rem' }} dangerouslySetInnerHTML={{ __html: fields.front || '<span style="color:var(--text-dim)">Pregunta...</span>' }} />
                </div>
                <div style={{ width: '60%', height: 1, background: 'var(--border-color)', margin: '16px auto' }} />
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: 6, fontWeight: 600 }}>DORSO</div>
                  <div className="flashcard-content" style={{ fontSize: '1.1rem' }} dangerouslySetInnerHTML={{ __html: fields.back || '<span style="color:var(--text-dim)">Respuesta...</span>' }} />
                </div>
              </div>
            </div>
            {tags.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {tags.map(tag => <span key={tag} className="tag-badge">{tag}</span>)}
              </div>
            )}
          </div>
        </div>
      </div>
      <ImageSearchModal 
        isOpen={!!activeImageField} 
        onClose={() => setActiveImageField(null)} 
        onSelect={handleImageSelect} 
      />
    </div>
  );
}

export default AddCard;
