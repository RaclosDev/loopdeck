import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { decksApi, notesApi, aiApi } from '../services/api';
import { handleImagePaste, compressImageFromPaste } from '../utils/imageUtils';
import { lookupDefinition, lookupImage } from '../utils/definitionService';
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
  const [imageSearchQuery, setImageSearchQuery] = useState('');
  const [lookingUpDef, setLookingUpDef] = useState(false);
  const [lookingUpImage, setLookingUpImage] = useState(false);
  const [autoPhotoUsed, setAutoPhotoUsed] = useState(false);
  const [addMode, setAddMode] = useState('single'); // 'single' | 'mass'
  const [massWords, setMassWords] = useState('');
  const [massGenerating, setMassGenerating] = useState(false);

  const tagInputRef = useRef(null);
  const frontFileRef = useRef(null);
  const backFileRef = useRef(null);

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
      setTimeout(() => {
        const els = document.querySelectorAll('.editor-content');
        const content = fieldName === 'front' ? els[0]?.innerHTML : els[1]?.innerHTML;
        if (content) setFields(prev => ({ ...prev, [fieldName]: content }));
      }, 50);
    });
  };

  // ── Gallery Image Picker ────────────────────────────────────
  const handleGalleryPick = (fieldName) => {
    const ref = fieldName === 'front' ? frontFileRef : backFileRef;
    ref.current?.click();
  };

  const handleFileSelected = async (fieldName, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      addToast('Comprimiendo imagen...', 'info');
      const compressedDataUrl = await compressImageFromPaste(file, 800, 0.75);
      const imgHtml = `<br><img src="${compressedDataUrl}" style="max-width: 100%; border-radius: 8px; margin: 8px 0;" alt="Foto"/>`;

      // Append image instead of replacing text
      const newContent = (fields[fieldName] || '') + imgHtml;
      setFields(prev => ({ ...prev, [fieldName]: newContent }));

      // Update DOM directly
      const els = document.querySelectorAll('.editor-content');
      const idx = fieldName === 'front' ? 0 : 1;
      if (els[idx]) els[idx].innerHTML = newContent;

      addToast('📷 Imagen añadida', 'success');
    } catch (err) {
      addToast('Error procesando imagen', 'error');
      console.error(err);
    }

    // Reset file input so same file can be selected again
    e.target.value = '';
  };

  // ── Wikipedia Image Picker ────────────────────────────────
  const handleOpenImageSearch = (fieldName) => {
    // Extract plain text from the field to use as initial query
    const text = (fields[fieldName] || '').replace(/<[^>]*>/g, '').trim();
    const word = text.split(/\s+/)[0]; // take first word

    setImageSearchQuery(word || '');
    setActiveImageField(fieldName);
  };

  const handleImageSelect = (url) => {
    if (!activeImageField) return;
    const imgHtml = `<br><img src="${url}" style="max-width: 100%; border-radius: 8px; margin: 8px 0;" alt="Selected image"/>`;
    
    // Append image instead of replacing
    const newContent = (fields[activeImageField] || '') + imgHtml;
    setFields(prev => ({ ...prev, [activeImageField]: newContent }));
    
    const els = document.querySelectorAll('.editor-content');
    const idx = activeImageField === 'front' ? 0 : 1;
    if (els[idx]) els[idx].innerHTML = newContent;
    
    setActiveImageField(null);
  };

  // ── Definition Lookup ───────────────────────────────────────
  const handleDefinition = async () => {
    // Extract plain text from front field
    const text = (fields.front || '').replace(/<[^>]*>/g, '').trim();
    const word = text.split(/\s+/)[0]; // take first word

    if (!word) {
      addToast('Escribe una palabra en el frente primero', 'warning');
      return;
    }

    setLookingUpDef(true);
    try {
      const result = await lookupDefinition(word);
      if (!result) {
        addToast(`No se encontró definición para "${word}"`, 'error');
        return;
      }

      // Front gets the definition
      let defHtml = `<div style="font-size: 0.95em">${result.definition}</div>`;
      
      // Back gets the word (replacing whatever was there, as requested)
      const newBack = `<strong>${word}</strong>`;

      setFields(prev => ({ ...prev, front: defHtml, back: newBack }));

      // Update DOM
      const els = document.querySelectorAll('.editor-content');
      if (els[0]) els[0].innerHTML = defHtml;
      if (els[1]) els[1].innerHTML = newBack;

      const lang = result.language === 'es' ? '🇪🇸' : '🇬🇧';
      addToast(`${lang} Definición IA lista`, 'success');
    } catch (err) {
      addToast('Error buscando definición', 'error');
      console.error(err);
    } finally {
      setLookingUpDef(false);
    }
  };

  const handleAutoImage = async () => {
    // Check both fields for a word, front preferred
    let text = (fields.front || '').replace(/<[^>]*>/g, '').trim();
    if (text.length > 30) {
      text = (fields.back || '').replace(/<[^>]*>/g, '').trim();
    }
    const word = text.split(/\s+/)[0];

    if (!word) {
      addToast('Escribe una palabra primero', 'warning');
      return;
    }

    setLookingUpImage(true);
    try {
      const imageUrl = await lookupImage(word);
      if (!imageUrl) {
        addToast(`No se encontró foto automática para "${word}"`, 'error');
        setAutoPhotoUsed(true); // Switch to manual buttons
        return;
      }

      const imgHtml = `<br><img src="${imageUrl}" style="max-width: 100%; border-radius: 8px; margin: 8px 0;" alt="" onerror="this.style.display='none'"/>`;
      
      const newFront = (fields.front || '') + imgHtml;
      setFields(prev => ({ ...prev, front: newFront }));
      
      const els = document.querySelectorAll('.editor-content');
      if (els[0]) els[0].innerHTML = newFront;

      addToast('📸 Foto automática añadida', 'success');
    } catch (err) {
      addToast('Error buscando foto', 'error');
      console.error(err);
    } finally {
      setLookingUpImage(false);
    }
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

      addToast(`Añadida${selectedType === 'reverse' ? 's 2' : ''} con éxito`, 'success');
      if (andClose) { navigate('/'); return; }
      
      clearEditor();
      if (frontFileRef.current) frontFileRef.current.value = '';
      if (backFileRef.current) backFileRef.current.value = '';
      setAutoPhotoUsed(false);

    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMassAdd = async () => {
    if (!selectedDeckId) { addToast('Selecciona un mazo', 'error'); return; }
    if (!massWords.trim()) { addToast('Introduce algunos conceptos', 'warning'); return; }

    setMassGenerating(true);
    try {
      addToast('Generando tarjetas con IA...', 'info');
      const cards = await aiApi.massDefine(massWords);
      
      if (!Array.isArray(cards) || cards.length === 0) {
        throw new Error('La IA no devolvió un formato válido o está vacío.');
      }

      let successCount = 0;
      for (const card of cards) {
        if (!card.front || !card.back) continue;
        
        await notesApi.create({
          deckId: selectedDeckId,
          noteType: 'basic', // Force basic for mass definition
          fieldsJson: JSON.stringify({ front: card.front, back: card.back }),
          tags: 'ia-masivo'
        });
        successCount++;
      }

      addToast(`✨ ${successCount} tarjetas generadas y añadidas al mazo`, 'success');
      setMassWords('');
      setAddMode('single'); // Go back to single mode after success
    } catch (err) {
      addToast('Error en la generación masiva: ' + err.message, 'error');
      console.error(err);
    } finally {
      setMassGenerating(false);
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { 
        e.preventDefault(); 
        if (addMode === 'single') handleAdd(false); 
        else handleMassAdd();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, selectedDeckId, selectedType, tags]);

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Añadir Tarjetas</h1>
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: 'var(--radius-lg)', gap: '4px' }}>
          <button 
            className={`glass-btn ${addMode === 'single' ? 'active' : ''}`}
            onClick={() => setAddMode('single')}
            style={{ border: 'none', background: addMode === 'single' ? 'var(--accent-color)' : 'transparent', color: addMode === 'single' ? '#fff' : 'var(--text-dim)' }}
          >
            Una a Una
          </button>
          <button 
            className={`glass-btn ${addMode === 'mass' ? 'active' : ''}`}
            onClick={() => setAddMode('mass')}
            style={{ border: 'none', background: addMode === 'mass' ? 'var(--accent-color)' : 'transparent', color: addMode === 'mass' ? '#fff' : 'var(--text-dim)' }}
          >
            ✨ En Masa (IA)
          </button>
        </div>
      </div>

      {/* Hidden file inputs for gallery picker */}
      <input ref={frontFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileSelected('front', e)} />
      <input ref={backFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileSelected('back', e)} />

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
          {addMode === 'single' && (
            <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
              <label>Tipo de nota</label>
              <select className="glass-select" value={selectedType} onChange={e => { setSelectedType(e.target.value); clearEditor(); }}>
                {NOTE_TYPES.map(t => <option key={t.id} value={t.id}>{t.name} — {t.description}</option>)}
              </select>
            </div>
          )}
        </div>

        {addMode === 'mass' ? (
          <div className="form-group">
            <div style={{ background: 'rgba(6,182,212,0.08)', padding: '15px 20px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(6,182,212,0.15)', marginBottom: 20 }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 600, color: 'var(--accent-light)' }}>🤖 Generación Mágica con Inteligencia Artificial</p>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                Escribe o pega una lista de conceptos, palabras clave o frases (separados por comas o saltos de línea). La IA se encargará de buscar una definición súper breve para cada uno y creará todas las tarjetas de golpe directamente en tu mazo.
              </p>
            </div>
            
            <label>Lista de Conceptos</label>
            <textarea
              className="input-field"
              style={{ width: '100%', minHeight: '200px', padding: '15px', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', color: 'white', resize: 'vertical' }}
              placeholder="Ejemplo:&#10;Polimorfismo&#10;Herencia&#10;Encapsulación&#10;Abstracción"
              value={massWords}
              onChange={e => setMassWords(e.target.value)}
              disabled={massGenerating}
            />
            
            <button 
              className="primary-btn" 
              onClick={handleMassAdd} 
              style={{ width: '100%', marginTop: '20px', padding: '15px' }} 
              disabled={massGenerating || !massWords.trim()}
            >
              {massGenerating ? <span className="spinner-sm" /> : '✨ Generar y Añadir Tarjetas (Ctrl+Enter)'}
            </button>
          </div>
        ) : (
          <div className="editor-grid">
          <div className="editor-fields">
            {/* Front field */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 6, flexWrap: 'wrap' }}>
                <label style={{ margin: 0 }}>Frente (Pregunta)</label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <button
                    className="glass-btn"
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    onClick={handleDefinition}
                    disabled={lookingUpDef}
                    title="Definición al frente, palabra al dorso"
                  >
                    {lookingUpDef ? <span className="spinner-sm" style={{ width: 14, height: 14, borderWidth: 2 }} /> : '📖 Def. IA'}
                  </button>
                  
                  {/* Always show Auto-foto button — it resets when front text changes */}
                  <button
                    className="glass-btn"
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    onClick={handleAutoImage}
                    disabled={lookingUpImage}
                    title="Obtener foto automáticamente"
                  >
                    {lookingUpImage ? <span className="spinner-sm" style={{ width: 14, height: 14, borderWidth: 2 }} /> : '✨ Foto Auto'}
                  </button>
                  
                  <button className="glass-btn" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => handleGalleryPick('front')} title="Añadir foto de la galería">
                    📷
                  </button>
                  <button className="glass-btn" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => handleOpenImageSearch('front')} title="Buscar imagen en Wikipedia">
                    🖼️ Buscar
                  </button>
                </div>
              </div>
              <div className="editor-content" contentEditable data-placeholder="Escribe la pregunta aquí..." onInput={handleFieldChange('front')} onPaste={handlePaste('front')} style={{ borderRadius: 'var(--radius-md)' }} />
            </div>

            {/* Back field */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 6 }}>
                <label style={{ margin: 0 }}>Dorso (Respuesta)</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="glass-btn" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => handleGalleryPick('back')} title="Añadir foto de la galería">
                    📷
                  </button>
                  <button className="glass-btn" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => handleOpenImageSearch('back')} title="Buscar imagen en Wikipedia">
                    🖼️ Buscar Foto
                  </button>
                </div>
              </div>
              <div className="editor-content" contentEditable data-placeholder="Escribe la respuesta aquí..." onInput={handleFieldChange('back')} onPaste={handlePaste('back')} style={{ borderRadius: 'var(--radius-md)' }} />
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
      )}
      </div>

      <ImageSearchModal 
        isOpen={!!activeImageField} 
        onClose={() => setActiveImageField(null)} 
        onSelect={handleImageSelect}
        initialQuery={imageSearchQuery}
      />
    </div>
  );
}

export default AddCard;
