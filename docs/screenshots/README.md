# Capturas de LoopDeck

Las imágenes muestran la aplicación React del repositorio ejecutada en Chromium. Los mazos, el usuario, los recuentos y los intervalos son ficticios; las respuestas de API se simulan en el navegador. No se accede a cuentas ni bases de datos reales, ni se generan imágenes con IA.

## Reproducir

Con Node.js 22+, desde la raíz:

```bash
npm --prefix frontend ci
cd frontend
npx playwright install chromium
npm run dev -- --host 127.0.0.1 --port 3000
```

Deja el servidor abierto y ejecuta en otra terminal, desde la raíz:

```bash
node docs/screenshots/capture.mjs
```

El script sobrescribe las tres capturas de esta carpeta. Usa únicamente el servidor local, intercepta las llamadas API y bloquea las conexiones externas. Verifica los estados visibles y que no haya desbordamiento horizontal. No necesita backend, credenciales ni Gemini.

| Archivo             | Vista                                                       |
| ------------------- | ----------------------------------------------------------- |
| `decks-desktop.png` | Colección de mazos, 1440 × 960.                             |
| `study-hub.png`     | Centro de estudio, ventana de 1440 × 960 y página completa. |
| `study-mobile.png`  | Respuesta de una tarjeta y controles de repaso, 390 × 844.  |

Revisa visualmente las imágenes antes de publicarlas si cambia la interfaz. El script usa movimiento reducido; las capturas no representan las animaciones de la app.
