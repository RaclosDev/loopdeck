/**
 * Modo demo: la aplicación completa bajo /demo con datos ficticios en memoria.
 * No usa el backend ni toca la sesión real guardada en el navegador.
 */
export const DEMO = /^\/demo(\/|$)/.test(window.location.pathname);

const encode = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** JWT sin firma, solo para que la interfaz tenga un usuario que mostrar. */
export const DEMO_TOKEN = [
  encode({ alg: 'none', typ: 'JWT' }),
  encode({
    sub: 'demo',
    email: 'demo@loopdeck.example',
    name: 'Visitante demo',
    exp: Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600,
  }),
  'demo',
].join('.');
