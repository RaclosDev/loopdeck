import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestReload, useUnsavedWork } from './reloadGuard';

function Draft({ active }: { active: boolean }) {
  useUnsavedWork(active);
  return null;
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('requestReload', () => {
  it('reloads at once when nothing is unsaved', () => {
    const reload = vi.fn();
    requestReload(reload);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('waits while a text field has something written and reloads once it is empty', () => {
    const field = document.createElement('textarea');
    field.value = 'a medio escribir';
    document.body.append(field);
    const reload = vi.fn();
    requestReload(reload);
    vi.advanceTimersByTime(20_000);
    expect(reload).not.toHaveBeenCalled();
    field.value = '';
    vi.advanceTimersByTime(5_000);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('also waits for a contenteditable editor with text', () => {
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');
    // jsdom no calcula isContentEditable: se fija a mano.
    Object.defineProperty(editor, 'isContentEditable', { value: true });
    editor.textContent = 'frente';
    document.body.append(editor);
    const reload = vi.fn();
    requestReload(reload);
    vi.advanceTimersByTime(10_000);
    expect(reload).not.toHaveBeenCalled();
    editor.textContent = '';
    vi.advanceTimersByTime(5_000);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not wait for empty or blank fields, checkboxes or buttons', () => {
    document.body.innerHTML =
      '<input value="   "><input type="checkbox" checked><input type="submit" value="Enviar"><textarea></textarea>';
    const reload = vi.fn();
    requestReload(reload);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('waits while a screen declares unsaved work and reloads when it is gone', () => {
    const view = render(<Draft active />);
    const reload = vi.fn();
    requestReload(reload);
    vi.advanceTimersByTime(20_000);
    expect(reload).not.toHaveBeenCalled();
    act(() => view.unmount());
    vi.advanceTimersByTime(0);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads when the screen stops declaring unsaved work', () => {
    const view = render(<Draft active />);
    const reload = vi.fn();
    requestReload(reload);
    view.rerender(<Draft active={false} />);
    vi.advanceTimersByTime(0);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('runs only once however many reloads are requested meanwhile', () => {
    const field = document.createElement('input');
    field.value = 'hola';
    document.body.append(field);
    const first = vi.fn();
    const second = vi.fn();
    requestReload(first);
    requestReload(second);
    field.value = '';
    vi.advanceTimersByTime(5_000);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    vi.advanceTimersByTime(20_000);
    expect(first).toHaveBeenCalledTimes(1);
  });
});
