# Capturas de LoopDeck

Las imágenes muestran la aplicación React del repositorio ejecutada en Chromium con emulación móvil de 430 × 932 píxeles CSS y la sesión iniciada. El script captura a densidad 3× (1290 × 2796) y él mismo reduce cada imagen a 860 × 1864 antes de guardarla. Los mazos, el usuario, los recuentos y los intervalos son datos de ejemplo; las respuestas de API se simulan en el navegador. La foto de perfil es un retrato de [randomuser.me](https://randomuser.me/) guardado en `avatar.jpg`, de modo que la captura no depende de la red para mostrarla. No se accede a cuentas ni bases de datos reales, ni se generan imágenes con IA.

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

Si el servidor usa otro puerto, pasa su origen como argumento: `node docs/screenshots/capture.mjs http://127.0.0.1:5712`.

El script sobrescribe las seis capturas de esta carpeta. Usa el servidor local e intercepta las llamadas API; cualquier petición que no reconozca hace fallar la ejecución. Permite únicamente las conexiones externas a Google Fonts que usa la app (Anton e Inter) y comprueba que las fuentes estén cargadas antes de capturar; si faltan, falla en lugar de utilizar fuentes de sustitución. Antes de cada captura verifica que no queden indicadores de carga ni avisos emergentes, que todas las imágenes estén cargadas y que no haya desbordamiento horizontal. No necesita backend, credenciales ni Gemini.

| Archivo                | Vista móvil                                          |
| ---------------------- | ---------------------------------------------------- |
| `decks-mobile.png`     | Colección de mazos con las tarjetas pendientes hoy.  |
| `study-hub-mobile.png` | Centro de estudio de un mazo.                        |
| `study-mobile.png`     | Respuesta de una tarjeta y controles de repaso.      |
| `quiz-mobile.png`      | Test de cuatro opciones con la respuesta elegida.    |
| `tutor-mobile.png`     | Conversación con el tutor IA sobre el mazo.          |
| `stats-mobile.png`     | Estadísticas generales y por mazo.                   |

Las seis imágenes capturan una pantalla, sin extender la página ni ocultar elementos de la interfaz. Necesitas conexión a Google Fonts para reproducirlas con la tipografía original.

`hero.jpg` combina capturas de esta carpeta en una composición HTML/CSS con marcos de teléfono. El generador compartido `render-showcase.mjs` se mantiene en los [scripts del perfil](https://github.com/RaclosDev/RaclosDev/tree/main/scripts).

Revisa visualmente las imágenes antes de publicarlas si cambia la interfaz. El script usa movimiento reducido; las capturas no representan las animaciones de la app.
