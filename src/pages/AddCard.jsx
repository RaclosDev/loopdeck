import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { decksApi, notesApi } from '../services/api';

const NOTE_TYPES = [
  { id: 'basic', name: 'Básica', description: 'Frente y dorso simple', fields: ['front', 'back'], cardsGenerated: 1 },
  { id: 'reverse', name: 'Básica + Reversa', description: 'Genera 2 tarjetas', fields: ['front', 'back'], cardsGenerated: 2 },
  { id: 'cloze', name: 'Cloze (Rellenar)', description: 'Texto con huecos {{c1::respuesta}}', fields: ['text', 'extra'], cardsGenerated: 'dynamic' },
];

function AddCard() {
  const { deckId: paramDeckId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useStore();

  const [decks, setDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState(paramDeckId || '');
  const [selectedType, setSelectedType] = useState('basic');
  const [fields, setFields] = useState({ front: '', back: '', text: '', extra: '' });
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [cardsAdded, setCardsAdded] = useState(0);
  const [saving, setSaving] = useState(false);

  const tagInputRef = useRef(null);

  useEffect(() => {
    decksApi.getAll().then(setDecks).catch(_e => addToast('Error cargando mazos', 'error'));
  }, [addToast]);

  useEffect(() => {
    if (paramDeckId) setSelectedDeckId(paramDeckId);
  }, [paramDeckId]);



  const execCommand = (command, value = null) => document.execCommand(command, false, value);

  const handleFieldChange = (fieldName) => (e) => {
    setFields(prev => ({ ...prev, [fieldName]: e.target.innerHTML }));
  };

  const insertCloze = () => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const text = selection.toString();
    if (!text) { addToast('Selecciona texto para crear un cloze', 'info'); return; }
    const clozeMatches = (fields.text || '').match(/\{\{c(\d+)::/g) || [];
    const maxNum = clozeMatches.reduce((max, m) => Math.max(max, parseInt(m.match(/\d+/)[0])), 0);
    document.execCommand('insertText', false, `{{c${maxNum + 1}::${text}}}`);
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
    setFields({ front: '', back: '', text: '', extra: '' });
    setTags([]);
    document.querySelectorAll('.editor-content').forEach(el => { el.innerHTML = ''; });
  };

  const handleAdd = async (andClose = false) => {
    if (!selectedDeckId) { addToast('Selecciona un mazo', 'error'); return; }

    const frontText = fields.front?.replace(/<[^>]*>/g, '').trim();
    const backText = fields.back?.replace(/<[^>]*>/g, '').trim();
    const clozeText = fields.text?.replace(/<[^>]*>/g, '').trim();

    if (selectedType === 'cloze') {
      if (!clozeText) { addToast('Escribe el texto con cloze deletions', 'error'); return; }
      if (!clozeText.includes('{{c')) { addToast('Usa {{c1::texto}} para crear huecos', 'error'); return; }
    } else {
      if (!frontText || !backText) { addToast('Rellena el frente y el dorso', 'error'); return; }
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
      const fieldsJson = selectedType === 'cloze'
        ? JSON.stringify({ text: fields.text || '', extra: fields.extra || '' })
        : JSON.stringify({ front: fields.front || '', back: fields.back || '' });

      await notesApi.create({
        deckId: selectedDeckId,
        noteType: selectedType,
        fieldsJson,
        tags: finalTags.join(' '),
      });

      const numCards = selectedType === 'reverse' ? 2 : 1;
      setCardsAdded(prev => prev + numCards);
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
      if (e.key === 'C' && (e.ctrlKey || e.metaKey) && e.shiftKey && selectedType === 'cloze') { e.preventDefault(); insertCloze(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, selectedDeckId, selectedType, tags]);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Añadir Tarjetas</h1>
        <p>
          {cardsAdded > 0
            ? `${cardsAdded} tarjeta${cardsAdded > 1 ? 's' : ''} añadida${cardsAdded > 1 ? 's' : ''} esta sesión`
            : 'Crea nuevas tarjetas para tus mazos'}
        </p>
      </div>

      <div className="editor-container">
        {/* Top Controls */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
            <label>Mazo</label>
            <select className="glass-select" value={selectedDeckId} onChange={e => setSelectedDeckId(e.target.value)}>
              <option value="">Seleccionar mazo...</option>
              {decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
            <label>Tipo de nota</label>
            <select className="glass-select" value={selectedType} onChange={e => { setSelectedType(e.target.value); clearEditor(); }}>
              {NOTE_TYPES.map(t => <option key={t.id} value={t.id}>{t.name} — {t.description}</option>)}
            </select>
          </div>
        </div>

        <div className="editor-grid">
          <div className="editor-fields">
            {selectedType === 'cloze' ? (
              <>
                <div className="form-group">
                  <label>Texto (usa {'{{c1::respuesta}}'} para crear huecos)</label>
                  <div className="editor-toolbar">
                    <button className="toolbar-btn" onClick={() => execCommand('bold')} title="Negrita"><b>B</b></button>
                    <button className="toolbar-btn" onClick={() => execCommand('italic')} title="Cursiva"><i>I</i></button>
                    <div className="toolbar-separator" />
                    <button className="toolbar-btn" onClick={insertCloze} title="Insertar Cloze (Ctrl+Shift+C)">[...]</button>
                  </div>
                  <div className="editor-content" contentEditable data-placeholder="La capital de {{c1::Francia}} es {{c2::París}}" onInput={handleFieldChange('text')} style={{ minHeight: 150 }} />
                </div>
                <div className="form-group">
                  <label>Extra (opcional)</label>
                  <div className="editor-content" contentEditable data-placeholder="Información adicional..." onInput={handleFieldChange('extra')} style={{ borderRadius: 'var(--radius-md)' }} />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label>Frente (Pregunta)</label>
                  <div className="editor-toolbar">
                    <button className="toolbar-btn" onClick={() => execCommand('bold')}><b>B</b></button>
                    <button className="toolbar-btn" onClick={() => execCommand('italic')}><i>I</i></button>
                    <button className="toolbar-btn" onClick={() => execCommand('underline')}><u>U</u></button>
                    <div className="toolbar-separator" />
                    <button className="toolbar-btn" onClick={() => execCommand('insertUnorderedList')}>•</button>
                  </div>
                  <div className="editor-content" contentEditable data-placeholder="Escribe la pregunta aquí..." onInput={handleFieldChange('front')} />
                </div>
                <div className="form-group">
                  <label>Dorso (Respuesta)</label>
                  <div className="editor-toolbar">
                    <button className="toolbar-btn" onClick={() => execCommand('bold')}><b>B</b></button>
                    <button className="toolbar-btn" onClick={() => execCommand('italic')}><i>I</i></button>
                    <button className="toolbar-btn" onClick={() => execCommand('underline')}><u>U</u></button>
                    <div className="toolbar-separator" />
                    <button className="toolbar-btn" onClick={() => execCommand('insertUnorderedList')}>•</button>
                  </div>
                  <div className="editor-content" contentEditable data-placeholder="Escribe la respuesta aquí..." onInput={handleFieldChange('back')} />
                </div>
              </>
            )}

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
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', background: 'rgba(6,182,212,0.08)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(6,182,212,0.15)' }}>
                ℹ️ Se generarán <strong>2 tarjetas</strong>: frente→dorso y dorso→frente.
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="editor-preview">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vista Previa</div>
            <div className="editor-preview-card glass-panel">
              {selectedType === 'cloze' ? (
                <div className="flashcard-content" style={{ fontSize: '1.1rem' }}
                  dangerouslySetInnerHTML={{ __html: fields.text
                    ? fields.text.replace(/\{\{c\d+::(.*?)\}\}/g, '<span style="color:var(--srs-new);border-bottom:2px dashed var(--srs-new);padding:0 4px">$1</span>')
                    : '<span style="color:var(--text-dim)">La pregunta aparecerá aquí...</span>'
                  }}
                />
              ) : (
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
              )}
            </div>
            {tags.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {tags.map(tag => <span key={tag} className="tag-badge">{tag}</span>)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddCard;
