import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

const QUICK_INTERVALS = [
  ['10 min', 10],
  ['1 hora', 60],
  ['Mañana', 1440],
  ['3 días', 4320],
  ['1 semana', 10080],
  ['1 mes', 43200],
] as const;

type Unit = 'minutes' | 'hours' | 'days';

interface CustomReviewScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (minutes: number) => void;
}

export default function CustomReviewScheduleDialog({
  open,
  onOpenChange,
  onSchedule,
}: CustomReviewScheduleDialogProps) {
  const [amount, setAmount] = useState('1');
  const [unit, setUnit] = useState<Unit>('days');
  const minutes = useMemo(() => {
    const multiplier = unit === 'minutes' ? 1 : unit === 'hours' ? 60 : 1440;
    return Math.round(Number(amount) * multiplier);
  }, [amount, unit]);
  const isValid = Number.isFinite(minutes) && minutes >= 1 && minutes <= 5_256_000;

  const schedule = (selectedMinutes: number) => {
    onOpenChange(false);
    onSchedule(selectedMinutes);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Elegir próximo repaso</DialogTitle>
          <DialogDescription>Guarda esta tarjeta para el momento que tú elijas.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2" aria-label="Intervalos frecuentes">
          {QUICK_INTERVALS.map(([label, quickMinutes]) => (
            <button
              key={quickMinutes}
              type="button"
              className="sheet-action justify-center"
              onClick={() => schedule(quickMinutes)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <label className="sr-only" htmlFor="custom-review-amount">
            Cantidad
          </label>
          <input
            id="custom-review-amount"
            className="input"
            type="number"
            min="1"
            max={unit === 'days' ? 3650 : unit === 'hours' ? 87600 : 5_256_000}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <label className="sr-only" htmlFor="custom-review-unit">
            Unidad
          </label>
          <select
            id="custom-review-unit"
            className="input w-32"
            value={unit}
            onChange={(event) => setUnit(event.target.value as Unit)}
          >
            <option value="minutes">minutos</option>
            <option value="hours">horas</option>
            <option value="days">días</option>
          </select>
        </div>
        <DialogFooter>
          <button type="button" className="sheet-action" onClick={() => onOpenChange(false)}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!isValid}
            onClick={() => schedule(minutes)}
          >
            Programar repaso
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
