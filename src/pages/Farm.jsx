import { useState, useEffect, useCallback, useRef } from 'react';
import useFarmStore from '../store/useFarmStore';
import useAuthStore from '../store/useAuthStore';
import useStore from '../store/useStore';
import { farmApi } from '../services/api';
import './Farm.css';

// ── Crop definitions (mirrored from backend for UI) ─────────
const CROPS = [
  // Tier 1
  { id: 'parsley', name: 'Perejil', emoji: '🌿', tier: 1, cost: 4, time: 20, sell: 9, level: 1 },
  { id: 'lettuce', name: 'Lechuga', emoji: '🥬', tier: 1, cost: 5, time: 30, sell: 12, level: 1 },
  { id: 'spinach', name: 'Espinaca', emoji: '🥗', tier: 1, cost: 6, time: 35, sell: 14, level: 1 },
  { id: 'chive', name: 'Cebolleta', emoji: '🧅', tier: 1, cost: 7, time: 40, sell: 16, level: 1 },
  { id: 'radish', name: 'Rabanito', emoji: '🫑', tier: 1, cost: 8, time: 45, sell: 18, level: 1 },
  // Tier 2
  { id: 'potato', name: 'Patata', emoji: '🥔', tier: 2, cost: 10, time: 60, sell: 24, level: 3 },
  { id: 'garlic', name: 'Ajo', emoji: '🧄', tier: 2, cost: 11, time: 70, sell: 28, level: 3 },
  { id: 'carrot', name: 'Zanahoria', emoji: '🥕', tier: 2, cost: 12, time: 75, sell: 30, level: 3 },
  { id: 'onion', name: 'Cebolla', emoji: '🧅', tier: 2, cost: 13, time: 90, sell: 32, level: 3 },
  { id: 'cucumber', name: 'Pepino', emoji: '🥒', tier: 2, cost: 14, time: 80, sell: 35, level: 3 },
  { id: 'tomato', name: 'Tomate', emoji: '🍅', tier: 2, cost: 15, time: 90, sell: 38, level: 3 },
  { id: 'pepper', name: 'Pimiento', emoji: '🫑', tier: 2, cost: 18, time: 105, sell: 45, level: 3 },
  // Tier 3
  { id: 'peas', name: 'Guisantes', emoji: '🫛', tier: 3, cost: 18, time: 105, sell: 46, level: 6 },
  { id: 'cabbage', name: 'Col', emoji: '🥬', tier: 3, cost: 20, time: 120, sell: 52, level: 6 },
  { id: 'zucchini', name: 'Calabacín', emoji: '🫛', tier: 3, cost: 22, time: 120, sell: 56, level: 6 },
  { id: 'corn', name: 'Maíz', emoji: '🌽', tier: 3, cost: 25, time: 150, sell: 65, level: 6 },
  { id: 'eggplant', name: 'Berenjena', emoji: '🍆', tier: 3, cost: 28, time: 165, sell: 72, level: 6 },
  { id: 'strawberry', name: 'Fresa', emoji: '🍓', tier: 3, cost: 30, time: 180, sell: 80, level: 6 },
  { id: 'broccoli', name: 'Brócoli', emoji: '🥦', tier: 3, cost: 35, time: 210, sell: 90, level: 6 },
  // Tier 4
  { id: 'asparagus', name: 'Espárrago', emoji: '🌱', tier: 4, cost: 40, time: 240, sell: 110, level: 10 },
  { id: 'beet', name: 'Remolacha', emoji: '🫐', tier: 4, cost: 42, time: 255, sell: 115, level: 10 },
  { id: 'artichoke', name: 'Alcachofa', emoji: '🌻', tier: 4, cost: 45, time: 270, sell: 125, level: 10 },
  { id: 'pumpkin', name: 'Calabaza', emoji: '🎃', tier: 4, cost: 50, time: 300, sell: 140, level: 10 },
  { id: 'melon', name: 'Melón', emoji: '🍈', tier: 4, cost: 55, time: 330, sell: 155, level: 10 },
  { id: 'watermelon', name: 'Sandía', emoji: '🍉', tier: 4, cost: 60, time: 360, sell: 170, level: 10 },
  // Tier 5
  { id: 'cherry', name: 'Cereza', emoji: '🍒', tier: 5, cost: 90, time: 600, sell: 275, level: 15 },
  { id: 'peach', name: 'Melocotón', emoji: '🍑', tier: 5, cost: 95, time: 660, sell: 290, level: 15 },
  { id: 'grape', name: 'Uvas', emoji: '🍇', tier: 5, cost: 100, time: 720, sell: 310, level: 15 },
  { id: 'mango', name: 'Mango', emoji: '🥭', tier: 5, cost: 110, time: 780, sell: 345, level: 15 },
  { id: 'pineapple', name: 'Piña', emoji: '🍍', tier: 5, cost: 120, time: 840, sell: 380, level: 15 },
  { id: 'avocado', name: 'Aguacate', emoji: '🥑', tier: 5, cost: 130, time: 960, sell: 420, level: 15 },
  // Tier 6
  { id: 'dragon_flower', name: 'Flor de Dragón', emoji: '🌺', tier: 6, cost: 300, time: 1080, sell: 900, level: 20 },
  { id: 'lunar_plant', name: 'Planta Lunar', emoji: '🌙', tier: 6, cost: 400, time: 1200, sell: 1200, level: 20 },
  { id: 'golden_truffle', name: 'Trufa Dorada', emoji: '🍄', tier: 6, cost: 500, time: 1440, sell: 1500, level: 20 },
  { id: 'crystal_veg', name: 'Cristal Vegetal', emoji: '💎', tier: 6, cost: 600, time: 2160, sell: 2000, level: 20 },
];

const ITEMS = [
  { id: 'fertilizer_basic', name: 'Fertilizante Básico', emoji: '💧', cost: 30, desc: '-25% tiempo de crecimiento' },
  { id: 'fertilizer_premium', name: 'Fertilizante Premium', emoji: '✨', cost: 80, desc: '-50% tiempo de crecimiento' },
  { id: 'revitalizer_small', name: 'Revitalizador', emoji: '💊', cost: 50, desc: 'Revive 1 planta marchita' },
  { id: 'revitalizer_large', name: 'Revitalizador Grande', emoji: '💉', cost: 150, desc: 'Revive TODAS las plantas' },
  { id: 'miracle_water', name: 'Agua Milagrosa', emoji: '🫧', cost: 100, desc: 'Congela marchitamiento 48h' },
  { id: 'golden_compost', name: 'Abono Dorado', emoji: '🥇', cost: 250, desc: '+50% valor de venta' },
];

const TOOLS = [
  { id: 'scarecrow', name: 'Espantapájaros', emoji: '🎃', cost: 300, desc: '+1 parcela protegida' },
  { id: 'watering_can', name: 'Regadera Automática', emoji: '🚿', cost: 500, desc: 'Retrasa marchitamiento +12h' },
  { id: 'well', name: 'Pozo de Agua', emoji: '🪣', cost: 800, desc: 'Fertilizantes -30% coste' },
  { id: 'silo', name: 'Silo', emoji: '🏗️', cost: 1000, desc: 'Almacena hasta 20 cosechas' },
  { id: 'windmill', name: 'Molino de Viento', emoji: '🌪️', cost: 1200, desc: '+10% ventas' },
  { id: 'greenhouse', name: 'Invernadero', emoji: '🏠', cost: 1500, desc: '2 parcelas protegidas' },
  { id: 'tractor', name: 'Tractor', emoji: '🚜', cost: 2000, desc: 'Cosechar Todo mejorado' },
];

const DECORATIONS = [
  { id: 'wooden_fence', name: 'Valla de Madera', emoji: '🪵', cost: 100 },
  { id: 'lantern', name: 'Farola', emoji: '🏮', cost: 150 },
  { id: 'garden_bench', name: 'Banco de Jardín', emoji: '🪑', cost: 200 },
  { id: 'stone_path', name: 'Camino de Piedra', emoji: '🪨', cost: 250 },
  { id: 'fountain', name: 'Fuente', emoji: '⛲', cost: 300 },
  { id: 'flower_arch', name: 'Arco de Flores', emoji: '🌸', cost: 400 },
  { id: 'duck_pond', name: 'Estanque con Patos', emoji: '🦆', cost: 500 },
];

const TIER_COLORS = {
  1: '#4ade80', 2: '#60a5fa', 3: '#a78bfa', 4: '#facc15', 5: '#f87171', 6: '#f59e0b'
};
const TIER_NAMES = {
  1: 'Iniciación', 2: 'Aprendiz', 3: 'Granjero', 4: 'Experto', 5: 'Maestro', 6: 'Legendario'
};

function formatTime(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatTimeRemaining(readyAt) {
  if (!readyAt) return '';
  const diff = new Date(readyAt) - Date.now();
  if (diff <= 0) return '¡Listo!';
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ── Plot Card Component ──────────────────────────────────────
function FarmPlotCard({ plot, coins, farmLevel, onPlant, onHarvest, onAction, onBuyPlot }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (plot.status === 'growing' && plot.readyAt) {
      const update = () => setTimeLeft(formatTimeRemaining(plot.readyAt));
      update();
      const interval = setInterval(update, 1000);
      return () => clearInterval(interval);
    }
  }, [plot.status, plot.readyAt]);

  const getGrowthPhase = () => {
    if (!plot.progressPercent) return '🌱';
    if (plot.progressPercent < 33) return '🌱';
    if (plot.progressPercent < 67) return '🌿';
    return '🪴';
  };

  if (plot.status === 'locked') {
    const canBuy = coins >= (plot.unlockCost || 0) && farmLevel >= (plot.requiredLevel || 1);
    return (
      <div className={`farm-plot farm-plot--locked ${canBuy ? 'farm-plot--buyable' : ''}`}
           onClick={() => canBuy && onBuyPlot()}>
        <div className="farm-plot__icon">🔒</div>
        <div className="farm-plot__price">🪙 {plot.unlockCost}</div>
        <div className="farm-plot__sublabel">Niv. {plot.requiredLevel}</div>
      </div>
    );
  }

  if (plot.status === 'empty') {
    return (
      <div className="farm-plot farm-plot--empty" onClick={onPlant}>
        <div className="farm-plot__icon farm-plot__add">+</div>
        <div className="farm-plot__sublabel">Plantar</div>
      </div>
    );
  }

  if (plot.status === 'growing') {
    const progress = Math.min(100, plot.progressPercent || 0);
    return (
      <div className="farm-plot farm-plot--growing" onClick={onAction}>
        <div className="farm-plot__icon">{getGrowthPhase()}</div>
        <div className="farm-plot__progress-bar">
          <div className="farm-plot__progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="farm-plot__time">⏱️ {timeLeft}</div>
        {plot.hasFertilizer && <div className="farm-plot__badge">💧</div>}
        {plot.hasGoldenCompost && <div className="farm-plot__badge farm-plot__badge--gold">🥇</div>}
      </div>
    );
  }

  if (plot.status === 'ready') {
    return (
      <div className="farm-plot farm-plot--ready" onClick={() => onHarvest()}>
        <div className="farm-plot__icon farm-plot__ready-glow">{plot.cropEmoji || '🌾'}</div>
        <div className="farm-plot__label">{plot.cropName}</div>
        <div className="farm-plot__sell">🪙 {plot.sellValue}</div>
      </div>
    );
  }

  if (plot.status === 'wilting') {
    return (
      <div className="farm-plot farm-plot--wilting" onClick={onAction}>
        <div className="farm-plot__icon farm-plot__wilting-icon">{plot.cropEmoji || '🌾'}</div>
        <div className="farm-plot__label">💧 {plot.cropName}</div>
        <div className="farm-plot__sell" style={{ color: '#f97316' }}>🪙 {plot.sellValue} (-50%)</div>
      </div>
    );
  }

  if (plot.status === 'dead') {
    return (
      <div className="farm-plot farm-plot--dead" onClick={onAction}>
        <div className="farm-plot__icon">💀</div>
        <div className="farm-plot__label">{plot.cropName}</div>
        <div className="farm-plot__sublabel">Muerto</div>
      </div>
    );
  }

  return <div className="farm-plot" />;
}

// ── Crop Selector Modal ──────────────────────────────────────
function CropSelector({ show, onClose, onSelect, coins, farmLevel }) {
  if (!show) return null;

  const available = CROPS.filter(c => c.level <= farmLevel);
  const locked = CROPS.filter(c => c.level > farmLevel).slice(0, 5);
  const grouped = {};
  available.forEach(c => {
    if (!grouped[c.tier]) grouped[c.tier] = [];
    grouped[c.tier].push(c);
  });

  return (
    <div className="farm-modal-overlay" onClick={onClose}>
      <div className="farm-modal" onClick={e => e.stopPropagation()}>
        <h2>🌱 ¿Qué quieres plantar?</h2>
        <div className="farm-modal__content">
          {Object.keys(grouped).sort().map(tier => (
            <div key={tier}>
              <div className="crop-tier-header" style={{ color: TIER_COLORS[tier] }}>
                {TIER_NAMES[tier]} (Tier {tier})
              </div>
              {grouped[tier].map(crop => (
                <button
                  key={crop.id}
                  className={`crop-option ${coins < crop.cost ? 'crop-option--disabled' : ''}`}
                  disabled={coins < crop.cost}
                  onClick={() => onSelect(crop.id)}
                >
                  <span className="crop-option__emoji">{crop.emoji}</span>
                  <div className="crop-option__info">
                    <div className="crop-option__name">{crop.name}</div>
                    <div className="crop-option__meta">
                      🪙 {crop.cost} · ⏱️ {formatTime(crop.time)} · → 🪙 {crop.sell}
                      <span className="crop-option__profit"> (+{crop.sell - crop.cost})</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ))}
          {locked.length > 0 && (
            <div>
              <div className="crop-tier-header" style={{ color: '#666' }}>🔒 Próximamente</div>
              {locked.map(crop => (
                <div key={crop.id} className="crop-option crop-option--locked">
                  <span className="crop-option__emoji" style={{ opacity: 0.4 }}>{crop.emoji}</span>
                  <div className="crop-option__info">
                    <div className="crop-option__name" style={{ color: '#666' }}>{crop.name}</div>
                    <div className="crop-option__meta" style={{ color: '#555' }}>Requiere Nivel {crop.level}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <button className="glass-btn" onClick={onClose} style={{ marginTop: 16, width: '100%' }}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Plot Action Modal ────────────────────────────────────────
function PlotActionModal({ show, plot, inventory, onClose, onHarvest, onUseItem, onClear }) {
  if (!show || !plot) return null;

  const hasFertBasic = inventory.find(i => i.itemId === 'fertilizer_basic' && i.quantity > 0);
  const hasFertPremium = inventory.find(i => i.itemId === 'fertilizer_premium' && i.quantity > 0);
  const hasCompost = inventory.find(i => i.itemId === 'golden_compost' && i.quantity > 0);
  const hasRevSmall = inventory.find(i => i.itemId === 'revitalizer_small' && i.quantity > 0);

  return (
    <div className="farm-modal-overlay" onClick={onClose}>
      <div className="farm-modal farm-modal--sm" onClick={e => e.stopPropagation()}>
        {plot.status === 'growing' && (
          <>
            <h2>{plot.cropEmoji} {plot.cropName}</h2>
            <div className="farm-modal__progress">
              <div className="farm-plot__progress-bar" style={{ height: 8 }}>
                <div className="farm-plot__progress-fill" style={{ width: `${plot.progressPercent || 0}%` }} />
              </div>
              <div style={{ textAlign: 'center', marginTop: 8, color: 'var(--text-dim)' }}>
                {Math.round(plot.progressPercent || 0)}% completado
              </div>
            </div>
            <div className="farm-modal__actions">
              {!plot.hasFertilizer && hasFertBasic && (
                <button className="primary-btn" onClick={() => onUseItem('fertilizer_basic', plot.index)}>
                  💧 Fertilizante Básico (x{hasFertBasic.quantity})
                </button>
              )}
              {!plot.hasFertilizer && hasFertPremium && (
                <button className="primary-btn" onClick={() => onUseItem('fertilizer_premium', plot.index)}>
                  ✨ Fertilizante Premium (x{hasFertPremium.quantity})
                </button>
              )}
              {!plot.hasGoldenCompost && hasCompost && (
                <button className="glass-btn" onClick={() => onUseItem('golden_compost', plot.index)}>
                  🥇 Abono Dorado (x{hasCompost.quantity})
                </button>
              )}
            </div>
          </>
        )}

        {plot.status === 'ready' && (
          <>
            <h2>{plot.cropEmoji} ¡{plot.cropName} lista! ✨</h2>
            <div style={{ textAlign: 'center', fontSize: '1.2rem', margin: '16px 0' }}>
              Valor: <b style={{ color: '#ffd700' }}>🪙 {plot.sellValue}</b>
            </div>
            <button className="primary-btn" style={{ width: '100%' }} onClick={(e) => onHarvest(plot.index, e)}>
              🌾 Cosechar
            </button>
          </>
        )}

        {plot.status === 'wilting' && (
          <>
            <h2>🥀 {plot.cropName} marchitándose</h2>
            <div style={{ textAlign: 'center', margin: '12px 0', color: '#f97316' }}>
              ⚠️ Valor reducido: <b>🪙 {plot.sellValue}</b>
            </div>
            <div className="farm-modal__actions">
              <button className="primary-btn" onClick={(e) => onHarvest(plot.index, e)}>
                🌾 Cosechar (-50%)
              </button>
              {hasRevSmall && (
                <button className="glass-btn" onClick={() => onUseItem('revitalizer_small', plot.index)}>
                  💊 Revitalizar (x{hasRevSmall.quantity})
                </button>
              )}
            </div>
          </>
        )}

        {plot.status === 'dead' && (
          <>
            <h2>💀 {plot.cropName} muerto</h2>
            <div style={{ textAlign: 'center', margin: '12px 0', color: '#ef4444' }}>
              La planta se ha perdido.
            </div>
            <div className="farm-modal__actions">
              <button className="glass-btn" onClick={() => onClear(plot.index)}>
                🗑️ Limpiar parcela
              </button>
              {hasRevSmall && (
                <button className="primary-btn" onClick={() => onUseItem('revitalizer_small', plot.index)}>
                  💊 Revitalizar (x{hasRevSmall.quantity})
                </button>
              )}
            </div>
          </>
        )}

        <button className="glass-btn" onClick={onClose} style={{ marginTop: 12, width: '100%' }}>Cerrar</button>
      </div>
    </div>
  );
}

// ── Shop Tab ─────────────────────────────────────────────────
function ShopTab({ coins, farmLevel, ownedTools, ownedDecorations, onBuyItem, onBuyTool, onBuyDecoration }) {
  const [subTab, setSubTab] = useState('items');

  return (
    <div className="farm-shop">
      <div className="farm-shop__tabs">
        {['items', 'tools', 'decorations'].map(t => (
          <button key={t} className={`farm-shop__tab ${subTab === t ? 'active' : ''}`}
                  onClick={() => setSubTab(t)}>
            {t === 'items' ? '📦 Items' : t === 'tools' ? '🔧 Herramientas' : '🎨 Decoraciones'}
          </button>
        ))}
      </div>

      {subTab === 'items' && (
        <div className="farm-shop__grid">
          {ITEMS.map(item => {
            let cost = item.cost;
            if (ownedTools.includes('well') && item.id.startsWith('fertilizer')) {
              cost = Math.floor(cost * 0.7); // -30% discount
            }
            return (
              <div key={item.id} className="farm-shop__item" title={item.desc}>
                <span className="farm-shop__item-emoji">{item.emoji}</span>
                <div className="farm-shop__item-info">
                  <div className="farm-shop__item-name">{item.name}</div>
                  <div className="farm-shop__item-desc">{item.desc}</div>
                </div>
                <button className="primary-btn farm-shop__buy-btn"
                        disabled={coins < cost}
                        onClick={() => onBuyItem(item.id)}>
                  🪙 {cost} {cost < item.cost && <span style={{ fontSize: '0.7rem', color: '#4ade80' }}>(-30%)</span>}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {subTab === 'tools' && (
        <div className="farm-shop__grid">
          {TOOLS.map(tool => {
            const owned = ownedTools.includes(tool.id);
            return (
              <div key={tool.id} className={`farm-shop__item ${owned ? 'farm-shop__item--owned' : ''}`} title={tool.desc}>
                <span className="farm-shop__item-emoji">{tool.emoji}</span>
                <div className="farm-shop__item-info">
                  <div className="farm-shop__item-name">{tool.name}</div>
                  <div className="farm-shop__item-desc">{tool.desc}</div>
                </div>
                {owned ? (
                  <span className="farm-shop__owned-badge">✅ Obtenido</span>
                ) : (
                  <button className="primary-btn farm-shop__buy-btn"
                          disabled={coins < tool.cost}
                          onClick={() => onBuyTool(tool.id)}>
                    🪙 {tool.cost}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {subTab === 'decorations' && (
        <div className="farm-shop__grid">
          {DECORATIONS.map(deco => {
            const owned = ownedDecorations.includes(deco.id);
            return (
              <div key={deco.id} className={`farm-shop__item ${owned ? 'farm-shop__item--owned' : ''}`}>
                <span className="farm-shop__item-emoji">{deco.emoji}</span>
                <div className="farm-shop__item-info">
                  <div className="farm-shop__item-name">{deco.name}</div>
                </div>
                {owned ? (
                  <span className="farm-shop__owned-badge">✅ Obtenido</span>
                ) : (
                  <button className="primary-btn farm-shop__buy-btn"
                          disabled={coins < deco.cost}
                          onClick={() => onBuyDecoration(deco.id)}>
                    🪙 {deco.cost}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Inventory Tab ────────────────────────────────────────────
function InventoryTab({ inventory }) {
  if (!inventory || inventory.length === 0) {
    return (
      <div className="farm-inventory-empty">
        <div style={{ fontSize: '3.5rem', marginBottom: 16, opacity: 0.8 }}>📦</div>
        <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>Tu inventario está vacío.</p>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem', marginTop: 8 }}>Compra fertilizantes y otros items en la Tienda para acelerar el crecimiento de tus cultivos y maximizar tus ganancias.</p>
      </div>
    );
  }

  return (
    <div className="farm-shop__grid">
      {inventory.map(item => {
        const itemDef = ITEMS.find(i => i.id === item.itemId) || {};
        return (
          <div key={item.itemId} className="farm-shop__item" title={itemDef.desc || ''}>
            <span className="farm-shop__item-emoji">{item.emoji}</span>
            <div className="farm-shop__item-info">
              <div className="farm-shop__item-name">{item.name}</div>
              {itemDef.desc && <div className="farm-shop__item-desc">{itemDef.desc}</div>}
            </div>
            <span className="farm-inventory__qty">x{item.quantity}</span>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── Main Farm Page ───────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
export default function Farm() {
  const { farm, plots, inventory, loading, loadFarm, plant, harvest, harvestAll, buyPlot, buyItem, useItem, buyTool, buyDecoration, clearPlot } = useFarmStore();
  const { user, updateUser } = useAuthStore();
  const { addToast } = useStore();
  const [tab, setTab] = useState('plots');
  const [cropSelector, setCropSelector] = useState(null); // plotIndex to plant
  const [actionPlot, setActionPlot] = useState(null); // plot for action modal
  const [busy, setBusy] = useState(false);
  const refreshTimer = useRef(null);

  useEffect(() => {
    loadFarm().catch(e => addToast('Error cargando granja: ' + e.message, 'error'));
  }, []);

  // Auto-refresh every 30s for growth updates
  useEffect(() => {
    refreshTimer.current = setInterval(() => {
      loadFarm().catch(() => {});
    }, 30000);
    return () => clearInterval(refreshTimer.current);
  }, []);

  const handlePlant = async (cropId) => {
    setBusy(true);
    try {
      await plant(cropSelector, cropId);
      setCropSelector(null);
      addToast('🌱 ¡Plantado con éxito!', 'success');
      // Update user coins
      if (user) updateUser({ ...user, points: farm?.coins });
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleHarvest = async (plotIndex, e) => {
    setBusy(true);
    try {
      const result = await harvest(plotIndex);
      setActionPlot(null);

      // Spawn coins animation
      if (e) {
        spawnCoins(e.clientX, e.clientY, result.coinsEarned);
      }

      addToast(`🌾 +${result.coinsEarned} monedas, +${result.xpEarned} XP${result.leveledUp ? ` ¡NIVEL ${result.newLevel}! 🎉` : ''}`, 'success');
      if (user) updateUser({ ...user, points: result.totalCoins });
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const spawnCoins = (x, y, amount) => {
    const container = document.body;
    for (let i = 0; i < Math.min(amount, 10); i++) {
      const coin = document.createElement('div');
      coin.className = 'floating-coin';
      coin.innerText = '🪙';
      coin.style.left = `${x + (Math.random() * 40 - 20)}px`;
      coin.style.top = `${y + (Math.random() * 40 - 20)}px`;
      container.appendChild(coin);
      
      setTimeout(() => {
        coin.remove();
      }, 1000);
    }
  };

  const handleHarvestAll = async (e) => {
    setBusy(true);
    try {
      const result = await harvestAll();
      
      if (e) {
        spawnCoins(e.clientX, e.clientY, result.totalCoinsEarned);
      }

      addToast(`🌾 ¡${result.harvested} cosechas! +${result.totalCoinsEarned} monedas, +${result.totalXpEarned} XP${result.leveledUp ? ` ¡NIVEL ${result.newLevel}! 🎉` : ''}`, 'success');
      if (user) updateUser({ ...user, points: result.totalCoins });
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleBuyPlot = async () => {
    setBusy(true);
    try {
      await buyPlot();
      addToast('🔓 ¡Nueva parcela desbloqueada!', 'success');
      if (farm) updateUser({ ...user, points: farm.coins });
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleBuyItem = async (itemId) => {
    setBusy(true);
    try {
      await buyItem(itemId);
      const item = ITEMS.find(i => i.id === itemId);
      addToast(`✅ ${item?.name || 'Item'} comprado`, 'success');
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleUseItem = async (itemId, plotIndex) => {
    setBusy(true);
    try {
      await useItem(itemId, plotIndex);
      setActionPlot(null);
      const item = ITEMS.find(i => i.id === itemId);
      addToast(`✅ ${item?.name || 'Item'} usado`, 'success');
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleBuyTool = async (toolId) => {
    setBusy(true);
    try {
      await buyTool(toolId);
      const tool = TOOLS.find(t => t.id === toolId);
      addToast(`🔧 ${tool?.name || 'Herramienta'} comprada`, 'success');
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleBuyDecoration = async (decoId) => {
    setBusy(true);
    try {
      await buyDecoration(decoId);
      const deco = DECORATIONS.find(d => d.id === decoId);
      addToast(`🎨 ${deco?.name || 'Decoración'} comprada`, 'success');
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async (plotIndex) => {
    setBusy(true);
    try {
      await clearPlot(plotIndex);
      setActionPlot(null);
      addToast('🗑️ Parcela limpiada', 'success');
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !farm) {
    return (
      <div className="animate-fade-in" style={{ textAlign: 'center', padding: 60 }}>
        <div className="spinner-sm" />
        <p style={{ marginTop: 16, color: 'var(--text-dim)' }}>Cargando tu granja...</p>
      </div>
    );
  }

  const readyCount = plots.filter(p => p.status === 'ready' || p.status === 'wilting').length;
  const coins = farm?.coins || 0;
  const level = farm?.level || 1;
  const xp = farm?.xp || 0;
  const xpNext = farm?.xpToNextLevel || 50;
  const xpProgress = xpNext > 0 ? Math.min(100, (xp / (xp + xpNext)) * 100) : 0;

  return (
    <div className="farm-page animate-fade-in">
      {/* Header */}
      <div className="farm-header">
        <div className="farm-header__top">
          <h1>🌾 Mi Granja</h1>
          <div className="farm-header__stats">
            <div className="farm-header__level">
              <span className="farm-header__level-badge">Niv. {level}</span>
              <div className="farm-header__xp-bar">
                <div className="farm-header__xp-fill" style={{ width: `${xpProgress}%` }} />
              </div>
              <span className="farm-header__xp-text">{xp} XP</span>
            </div>
            <div className="farm-header__coins">🪙 {coins}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="farm-tabs">
          {[
            { id: 'plots', label: '🌱 Parcelas' },
            { id: 'shop', label: '🛍️ Tienda' },
            { id: 'inventory', label: '📦 Inventario' },
            ...(farm?.ownedTools?.includes('silo') ? [{ id: 'silo', label: '🏗️ Silo (Stats)' }] : [])
          ].map(t => (
            <button key={t.id}
              className={`farm-tab ${tab === t.id ? 'farm-tab--active' : ''}`}
              onClick={() => setTab(t.id)}>
              {t.label}
              {t.id === 'inventory' && inventory.length > 0 && (
                <span className="farm-tab__badge">{inventory.reduce((a, b) => a + b.quantity, 0)}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Silo Tab */}
      {tab === 'silo' && (
        <div className="farm-shop__grid">
          {(!farm.silo || farm.silo.length === 0) ? (
             <div className="farm-inventory-empty" style={{gridColumn: '1 / -1'}}>
               <div style={{ fontSize: '3.5rem', marginBottom: 16, opacity: 0.8 }}>🏗️</div>
               <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>El Silo está vacío.</p>
               <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem', marginTop: 8 }}>Cosecha cultivos para ir llenando tus estadísticas históricas.</p>
             </div>
          ) : (
            farm.silo.sort((a, b) => b.quantity - a.quantity).map(item => (
              <div key={item.cropId} className="farm-shop__item">
                <span className="farm-shop__item-emoji">{item.emoji}</span>
                <div className="farm-shop__item-info">
                  <div className="farm-shop__item-name">{item.name}</div>
                  <div className="farm-shop__item-desc">Cosechas totales</div>
                </div>
                <span className="farm-inventory__qty" style={{color: '#ffd700'}}>x{item.quantity}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Plots Tab */}
      {tab === 'plots' && (
        <div className={`farm-environment ${farm?.ownedDecorations?.includes('wooden_fence') ? 'farm-env--fenced' : ''}`}>
          
          {/* Top Decorations */}
          <div className="farm-env__top-decos">
            {farm?.ownedDecorations?.includes('fountain') && <span className="farm-deco" title="Fuente">⛲</span>}
            {farm?.ownedDecorations?.includes('lantern') && <span className="farm-deco" title="Farola">🏮</span>}
            {farm?.ownedDecorations?.includes('flower_arch') && <span className="farm-deco" title="Arco de Flores">🌸</span>}
          </div>

          <div className="farm-grid">
            {plots.map(plot => (
              <FarmPlotCard
                key={plot.index}
                plot={plot}
                coins={coins}
                farmLevel={level}
                onPlant={() => setCropSelector(plot.index)}
                onHarvest={(e) => handleHarvest(plot.index, e)}
                onAction={() => setActionPlot(plot)}
                onBuyPlot={handleBuyPlot}
              />
            ))}
          </div>

          {/* Bottom Decorations */}
          <div className="farm-env__bottom-decos">
            {farm?.ownedDecorations?.includes('garden_bench') && <span className="farm-deco" title="Banco">🪑</span>}
            {farm?.ownedDecorations?.includes('duck_pond') && <span className="farm-deco" title="Estanque">🦆</span>}
            {farm?.ownedDecorations?.includes('stone_path') && <div className="farm-deco--path"></div>}
          </div>

          {readyCount >= 2 && farm?.ownedTools?.includes('tractor') && (
            <button className="farm-harvest-all-btn primary-btn"
                    disabled={busy}
                    onClick={handleHarvestAll}>
              🚜 Cosechar Todo ({readyCount})
            </button>
          )}
        </div>
      )}

      {/* Shop Tab */}
      {tab === 'shop' && (
        <ShopTab
          coins={coins}
          farmLevel={level}
          ownedTools={farm?.ownedTools || []}
          ownedDecorations={farm?.ownedDecorations || []}
          onBuyItem={handleBuyItem}
          onBuyTool={handleBuyTool}
          onBuyDecoration={handleBuyDecoration}
        />
      )}

      {/* Inventory Tab */}
      {tab === 'inventory' && <InventoryTab inventory={inventory} />}

      {/* Modals */}
      <CropSelector
        show={cropSelector !== null}
        onClose={() => setCropSelector(null)}
        onSelect={handlePlant}
        coins={coins}
        farmLevel={level}
      />
      <PlotActionModal
        show={actionPlot !== null}
        plot={actionPlot}
        inventory={inventory}
        onClose={() => setActionPlot(null)}
        onHarvest={handleHarvest}
        onUseItem={handleUseItem}
        onClear={handleClear}
      />
    </div>
  );
}
