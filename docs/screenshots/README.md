# Capturas de LoopDeck

Las imágenes muestran la aplicación React del repositorio ejecutada en Chromium con emulación móvil de 430 × 932 píxeles CSS y densidad 2× (imágenes de 860 × 1864). Los mazos, el usuario, los recuentos y los intervalos son ficticios; las respuestas de API se simulan en el navegador. No se accede a cuentas ni bases de datos reales, ni se generan imágenes con IA.

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

El script sobrescribe las tres capturas de esta carpeta. Usa el servidor local e intercepta las llamadas API. Permite únicamente las conexiones externas a Google Fonts que usa la app (Anton, Permanent Marker e Inter), y comprueba que las fuentes estén cargadas antes de capturar; si faltan, falla en lugar de utilizar fuentes de sustitución. Verifica los estados visibles y que no haya desbordamiento horizontal. No necesita backend, credenciales ni Gemini.

| Archivo                | Vista móvil                                     |
| ---------------------- | ----------------------------------------------- |
| `decks-mobile.png`     | Colección de mazos.                             |
| `study-hub-mobile.png` | Centro de estudio.                              |
| `study-mobile.png`     | Respuesta de una tarjeta y controles de repaso. |

Las tres imágenes capturan una pantalla, sin extender la página ni ocultar elementos de la interfaz. Necesitas conexión a Google Fonts para reproducirlas con la tipografía original.

Revisa visualmente las imágenes antes de publicarlas si cambia la interfaz. El script usa movimiento reducido; las capturas no representan las animaciones de la app.
