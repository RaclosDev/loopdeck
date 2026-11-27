import { useEffect } from 'react';

/**
 * Las recargas automáticas (versión nueva de la app, service worker actualizado) no deben tirar lo
 * que el usuario está escribiendo. `requestReload` recarga al momento si no hay nada sin guardar y,
 * si lo hay, espera a que deje de haberlo.
 *
 * Hay trabajo sin guardar si alguna pantalla lo declara (`useUnsavedWork`) o si algún campo de
 * texto de la página tiene algo escrito.
 */

const RECHECK_MS = 5_000;
const NON_TEXT_INPUTS = new Set([
  'hidden',
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
  'file',
  'range',
  'color',
  'image',
]);

let declared = 0;
let waiting: (() => void) | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function fieldHasText(field: Element): boolean {
  if (field instanceof HTMLTextAreaElement) return field.value.trim() !== '' && !field.readOnly;
  if (field instanceof HTMLInputElement)
    return !NON_TEXT_INPUTS.has(field.type) && field.value.trim() !== '' && !field.readOnly;
  return (
    field instanceof HTMLElement &&
    field.isContentEditable &&
    ((field.textContent ?? '').trim() !== '' || field.querySelector('img') !== null)
  );
}

function hasUnsavedWork(): boolean {
  if (declared > 0) return true;
  return [...document.querySelectorAll('input, textarea, [contenteditable]')].some(fieldHasText);
}

function stopWaiting() {
  if (timer) clearInterval(timer);
  timer = null;
  waiting = null;
}

function runIfSafe() {
  if (!waiting || hasUnsavedWork()) return;
  const reload = waiting;
  stopWaiting();
  reload();
}

/** Ejecuta `reload` ya, o en cuanto no quede nada sin guardar. Varias peticiones seguidas valen una. */
export function requestReload(reload: () => void) {
  if (!hasUnsavedWork()) {
    reload();
    return;
  }
  waiting ??= reload;
  timer ??= setInterval(runIfSafe, RECHECK_MS);
}

/** Una pantalla con cambios sin guardar mientras `active` sea cierto. */
export function useUnsavedWork(active: boolean) {
  useEffect(() => {
    if (!active) return;
    declared += 1;
    return () => {
      declared -= 1;
      // Se comprueba tras el desmontaje, cuando el DOM ya no tiene los campos de esa pantalla.
      setTimeout(runIfSafe, 0);
    };
  }, [active]);
}
