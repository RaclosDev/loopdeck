import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import useStore from '../store/useStore';
import { decksApi, studyApi } from '../services/api';

function Dashboard() {
  const [decks, setDecks] = useState([]);
  const [deckCounts, setDeckCounts] = useState({}); // { deckId: { new, learning, review, total } }
  const [loading, setLoading] = useState(true);
  const [showNewDeck, setShowNewDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDesc, setNewDeckDesc] = useState('');
  const [editingDeck, setEditingDeck] = useState(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useStore();

  const loadDecks = useCallback(async () => {
    try {
      const data = await decksApi.getAll();
      setDecks(data);
      // Load due counts for each deck in parallel
      const countResults = await Promise.allSettled(
        data.map(d => studyApi.getDueCards(d.id, 200).then(cards => ({ id: d.id, cards })))
      );
      const counts = {};
      countResults.forEach(r => {
        if (r.status === 'fulfilled') {
          const { id, cards } = r.value;
          const now = new Date();
          counts[id] = {
            new: cards.filter(c => c.state === 'new').length,
            learning: cards.filter(c => (c.state === 'learning' || c.state === 'relearning') && new Date(c.due) <= now).length,
            review: cards.filter(c => c.state === 'review' && new Date(c.due) <= now).length,
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
      const deck = await decksApi.create({ name: newDeckName.trim(), description: newDeckDesc.trim() });
      setDecks(prev => [...prev, deck]);
      setDeckCounts(prev => ({ ...prev, [deck.id]: { new: 0, learning: 0, review: 0, total: 0 } }));
      setNewDeckName(''); setNewDeckDesc('');
      setShowNewDeck(false);
      addToast(`Mazo "${deck.name}" creado`, 'success');
    } catch (e) {
      addToast('Error creando mazo: ' + e.message, 'error');
    } finally { setSaving(false); }
  };

  const handleUpdateDeck = async () => {
    if (!editingDeck || !newDeckName.trim()) return;
    setSaving(true);
    try {
      const updated = await decksApi.update(editingDeck.id, { name: newDeckName.trim(), description: newDeckDesc.trim() });
      setDecks(prev => prev.map(d => d.id === updated.id ? updated : d));
      setEditingDeck(null); setNewDeckName(''); setNewDeckDesc('');
      addToast('Mazo actualizado', 'success');
    } catch (e) {
      addToast('Error: ' + e.message, 'error');
    } finally { setSaving(false); }
  };

  const handleDeleteDeck = async (deck) => {
    if (!confirm(`¿Eliminar "${deck.name}" y todas sus tarjetas?`)) return;
    try {
      await decksApi.delete(deck.id);
      setDecks(prev => prev.filter(d => d.id !== deck.id));
      addToast(`"${deck.name}" eliminado`, 'info');
    } catch (e) {
      addToast('Error: ' + e.message, 'error');
    }
  };

  const getCounts = (deckId) => deckCounts[deckId] || { new: 0, learning: 0, review: 0, total: 0 };
  const getTotalDue = (c) => c.new + c.learning + c.review;

  const totalNew = Object.values(deckCounts).reduce((s, c) => s + c.new, 0);
  const totalLearning = Object.values(deckCounts).reduce((s, c) => s + c.learning, 0);
  const totalReview = Object.values(deckCounts).reduce((s, c) => s + c.review, 0);
  const totalCards = Object.values(deckCounts).reduce((s, c) => s + c.total, 0);

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner-sm" style={{ width: 40, height: 40, margin: '0 auto 16px', borderWidth: 3 }} />
          <p style={{ color: 'var(--text-muted)' }}>Cargando mazos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Mis Mazos</h1>
        <p>
          {decks.length === 0
            ? 'Crea tu primer mazo para empezar a estudiar'
            : `${decks.length} mazo${decks.length !== 1 ? 's' : ''} · ${totalNew + totalLearning + totalReview} pendientes hoy`
          }
        </p>
      </div>

      {/* Today's Summary */}
      {decks.length > 0 && (totalNew + totalLearning + totalReview) > 0 && (
        <div className="stats-grid" style={{ marginBottom: 28 }}>
          <div className="stat-card">
            <div className="stat-card-value" style={{ color: 'var(--srs-new)' }}>{totalNew}</div>
            <div className="stat-card-label">Nuevas</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value" style={{ color: 'var(--srs-learning)' }}>{totalLearning}</div>
            <div className="stat-card-label">Aprendiendo</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value" style={{ color: 'var(--srs-review)' }}>{totalReview}</div>
            <div className="stat-card-label">Revisión</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">{totalCards}</div>
            <div className="stat-card-label">Total</div>
          </div>
        </div>
      )}

      {/* Decks Grid */}
      <div className="decks-grid">
        {decks.map(deck => {
          const counts = getCounts(deck.id);
          const due = getTotalDue(counts);
          const progress = counts.total > 0 ? ((counts.total - counts.new) / counts.total) * 100 : 0;

          return (
            <div key={deck.id} className="deck-card">
              <div className="deck-card-header">
                <span className="deck-card-name">{deck.name}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className="deck-card-menu"
                    onClick={e => { e.stopPropagation(); setEditingDeck(deck); setNewDeckName(deck.name); setNewDeckDesc(deck.description || ''); }}
                    title="Editar"
                  >✏️</button>
                  <button
                    className="deck-card-menu"
                    onClick={e => { e.stopPropagation(); handleDeleteDeck(deck); }}
                    title="Eliminar"
                  >🗑️</button>
                </div>
              </div>

              {deck.description && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 10, padding: '0 2px' }}>
                  {deck.description}
                </div>
              )}

              <div className="deck-card-counts">
                <div className="deck-count">
                  <span className="deck-count-number new">{counts.new}</span>
                  <span className="deck-count-label">Nuevas</span>
                </div>
                <div className="deck-count">
                  <span className="deck-count-number learning">{counts.learning}</span>
                  <span className="deck-count-label">Aprendiendo</span>
                </div>
                <div className="deck-count">
                  <span className="deck-count-number review">{counts.review}</span>
                  <span className="deck-count-label">Revisión</span>
                </div>
              </div>

              <div className="deck-card-progress">
                <div className="deck-card-progress-bar" style={{ width: `${progress}%` }} />
              </div>

              <div className="deck-card-actions">
                <button
                  className="deck-study-btn"
                  onClick={() => navigate(`/study/${deck.id}`)}
                  disabled={due === 0 && counts.new === 0}
                >
                  {due > 0 || counts.new > 0 ? `Estudiar (${due})` : 'Al día ✓'}
                </button>
                <button
                  className="deck-action-btn"
                  onClick={() => navigate(`/add/${deck.id}`)}
                  title="Añadir tarjetas"
                >➕</button>
              </div>
            </div>
          );
        })}

        {/* Add Deck Card */}
        <div className="deck-card-new" onClick={() => setShowNewDeck(true)}>
          <span className="deck-card-new-icon">➕</span>
          <span className="deck-card-new-text">Nuevo Mazo</span>
        </div>
      </div>

      {/* Empty State */}
      {decks.length === 0 && (
        <div className="empty-state" style={{ marginTop: -20 }}>
          <div className="empty-state-icon">🧠</div>
          <h3>¡Bienvenido a LoopDeck!</h3>
          <p>Crea tu primer mazo de tarjetas y empieza a memorizar con repetición espaciada.</p>
          <button className="primary-btn" onClick={() => setShowNewDeck(true)}>
            ➕ Crear mi primer mazo
          </button>
        </div>
      )}

      {/* New Deck Modal */}
      <Modal
        isOpen={showNewDeck}
        onClose={() => { setShowNewDeck(false); setNewDeckName(''); setNewDeckDesc(''); }}
        title="Nuevo Mazo"
        footer={
          <>
            <button className="glass-btn" onClick={() => { setShowNewDeck(false); setNewDeckName(''); setNewDeckDesc(''); }}>Cancelar</button>
            <button className="primary-btn" onClick={handleCreateDeck} disabled={!newDeckName.trim() || saving}>
              {saving ? <span className="spinner-sm" /> : 'Crear Mazo'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label htmlFor="deck-name">Nombre del mazo</label>
            <input id="deck-name" type="text" className="glass-input" placeholder="Ej: Inglés, Anatomía, React..." value={newDeckName} onChange={e => setNewDeckName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateDeck()} autoFocus />
          </div>
          <div className="form-group">
            <label htmlFor="deck-desc">Descripción (opcional)</label>
            <input id="deck-desc" type="text" className="glass-input" placeholder="Describe el contenido del mazo..." value={newDeckDesc} onChange={e => setNewDeckDesc(e.target.value)} />
          </div>
        </div>
      </Modal>

      {/* Edit Deck Modal */}
      <Modal
        isOpen={!!editingDeck}
        onClose={() => { setEditingDeck(null); setNewDeckName(''); setNewDeckDesc(''); }}
        title="Editar Mazo"
        footer={
          <>
            <button className="glass-btn" onClick={() => { setEditingDeck(null); setNewDeckName(''); setNewDeckDesc(''); }}>Cancelar</button>
            <button className="primary-btn" onClick={handleUpdateDeck} disabled={!newDeckName.trim() || saving}>
              {saving ? <span className="spinner-sm" /> : 'Guardar'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label htmlFor="edit-deck-name">Nombre</label>
            <input id="edit-deck-name" type="text" className="glass-input" value={newDeckName} onChange={e => setNewDeckName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUpdateDeck()} autoFocus />
          </div>
          <div className="form-group">
            <label htmlFor="edit-deck-desc">Descripción</label>
            <input id="edit-deck-desc" type="text" className="glass-input" value={newDeckDesc} onChange={e => setNewDeckDesc(e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Dashboard;
