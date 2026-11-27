import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SelectMenu } from './select-menu';

const options = [
  { value: 'a', label: 'Primero' },
  { separator: true as const },
  { value: 'b', label: 'Segundo' },
];

describe('with the Popover API', () => {
  it('renders the custom menu', () => {
    render(<SelectMenu value="a" onChange={() => {}} options={options} aria-label="Orden" />);
    expect(screen.getByRole('button', { name: 'Orden' })).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByRole('menuitemradio', { name: 'Segundo', hidden: true })).toBeTruthy();
  });
});

describe('without the Popover API', () => {
  const { showPopover, hidePopover } = HTMLElement.prototype;
  const remove = () => {
    // Simula un navegador anterior a la API Popover.
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover');
    Reflect.deleteProperty(HTMLElement.prototype, 'hidePopover');
  };
  afterEach(() => {
    HTMLElement.prototype.showPopover = showPopover;
    HTMLElement.prototype.hidePopover = hidePopover;
  });

  it('falls back to a native select with the same options and value', () => {
    remove();
    render(<SelectMenu value="b" onChange={() => {}} options={options} aria-label="Orden" />);
    const select = screen.getByRole('combobox', { name: 'Orden' }) as HTMLSelectElement;
    expect(select.value).toBe('b');
    expect([...select.options].map((o) => o.textContent)).toEqual(['Primero', 'Segundo']);
  });

  it('reports the chosen value', () => {
    remove();
    const onChange = vi.fn();
    render(<SelectMenu value="a" onChange={onChange} options={options} aria-label="Orden" />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } });
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('keeps the extra action and respects disabled', () => {
    remove();
    const onSelect = vi.fn();
    const onChange = vi.fn();
    render(
      <SelectMenu
        value="a"
        onChange={onChange}
        options={options}
        action={{ label: 'Nuevo…', onSelect }}
        aria-label="Orden"
      />,
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '\u0000action' } });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('can be disabled', () => {
    remove();
    render(
      <SelectMenu value="a" onChange={() => {}} options={options} aria-label="Orden" disabled />,
    );
    expect((screen.getByRole('combobox') as HTMLSelectElement).disabled).toBe(true);
  });
});
