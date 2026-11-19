import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CustomReviewScheduleDialog from './CustomReviewScheduleDialog';

describe('CustomReviewScheduleDialog', () => {
  it('schedules a selected quick interval and closes the dialog', () => {
    const onOpenChange = vi.fn();
    const onSchedule = vi.fn();
    render(<CustomReviewScheduleDialog open onOpenChange={onOpenChange} onSchedule={onSchedule} />);

    fireEvent.click(screen.getByRole('button', { name: '1 semana' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSchedule).toHaveBeenCalledWith(10080);
  });

  it('converts a custom amount to minutes', () => {
    const onSchedule = vi.fn();
    render(<CustomReviewScheduleDialog open onOpenChange={() => {}} onSchedule={onSchedule} />);

    fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '3' } });
    fireEvent.click(screen.getByLabelText('Unidad'));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'horas', hidden: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Programar repaso' }));

    expect(onSchedule).toHaveBeenCalledWith(180);
  });
});
