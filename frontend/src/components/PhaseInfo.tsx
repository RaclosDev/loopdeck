import { useState } from 'react';
import { Info } from 'lucide-react';

const PHASES = [
  { name: 'Nuevas', text: 'Todavía no las has estudiado ninguna vez.' },
  {
    name: 'Aprendiendo',
    text: 'Las has empezado o las has fallado: vuelven enseguida hasta que te las sabes.',
  },
  {
    name: 'Revisión',
    text: 'Ya te las sabes: salen cada vez más espaciadas para que no se te olviden.',
  },
];

/** La «i» que explica las tres fases de una tarjeta al pasar el ratón, enfocar o tocar. */
export default function PhaseInfo() {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="add-card-info phase-info"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="add-card-info-btn"
        aria-label="Qué significan Nuevas, Aprendiendo y Revisión"
        aria-expanded={open}
        aria-describedby={open ? 'phase-info-pop' : undefined}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      >
        <Info size={16} aria-hidden="true" />
      </button>
      {open && (
        <span className="add-card-info-pop" role="tooltip" id="phase-info-pop">
          {PHASES.map((p) => (
            <span key={p.name}>
              <strong>{p.name}</strong>
              {p.text}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
