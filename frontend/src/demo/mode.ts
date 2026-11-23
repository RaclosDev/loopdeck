/**
 * Modo demo: la aplicación completa bajo /demo con datos ficticios en memoria.
 * No usa el backend ni toca la sesión real guardada en el navegador.
 */
export const DEMO = /^\/demo(\/|$)/.test(window.location.pathname);

/**
 * La demo incrustada en la portada (un iframe del mismo origen). Comparte el almacenamiento del
 * navegador con la página que la contiene, así que guarda el tema y el color solo en memoria.
 */
export const EMBED = DEMO && window.parent !== window;

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value));
  }
}

if (EMBED) {
  Object.defineProperty(window, 'localStorage', { value: new MemoryStorage(), configurable: true });
  Object.defineProperty(window, 'sessionStorage', {
    value: new MemoryStorage(),
    configurable: true,
  });
  document.documentElement.classList.add('is-embed');
}

const encode = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** JWT sin firma, solo para que la interfaz tenga un usuario que mostrar. */
export const DEMO_TOKEN = [
  encode({ alg: 'none', typ: 'JWT' }),
  encode({
    sub: 'demo',
    email: 'demo@loopdeck.example',
    name: 'Visitante demo',
    // Retrato libre de randomuser.me para que la cabecera se vea como con una cuenta real.
    picture: 'https://randomuser.me/api/portraits/women/44.jpg',
    exp: Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600,
  }),
  'demo',
].join('.');
