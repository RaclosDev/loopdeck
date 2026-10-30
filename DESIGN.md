# LoopDeck: papel y tinta

La interfaz comparte la familia visual de PorrApp, conservando los flujos y la marca de LoopDeck. Energía 2, ritmo 2, movimiento 1.

## Decisiones

- Fondo azul oscuro `#0f172a`: separa la navegación del cuaderno de trabajo. El tema claro conserva el papel y utiliza una pared gris cálida.
- Papel `#f3ecdc`, tinta `#111827` y acento `#0b5f74`: reutilizan la identidad de la referencia y permiten leer durante sesiones largas.
- Anton para títulos y Permanent Marker para anotaciones: distinguen cartel y rotulador; Inter mantiene legibles las preguntas, respuestas y formularios.
- Textura SVG tenue: evoca el folio sin imágenes pesadas ni interferencia con el contenido.
- Cinta amarilla: identifica el folio principal y el acceso; su centro permanece al 50%, con inclinación aleatoria de −6° a 6° estable durante la vida del elemento.
- Bordes pequeños, sombras desplazadas y pestañas de tinta: representan papel y fichas, sin superficies de cristal.
- Un folio principal y tarjetas interiores: agrupan el contenido real de cada ruta sin alterar su jerarquía ni añadir funciones.
- Movimiento limitado a los estados y al giro de estudio; `prefers-reduced-motion` elimina las transiciones perceptibles.
- La personalización conserva el color elegido y oscurece su tinta cuando hace falta para mantener contraste sobre papel.

## Superficies

El marco compartido cubre mazos, centro de estudio, añadir tarjeta, explorador, plantillas, estadísticas, ajustes y cuenta. Las rutas de cada mazo conservan repaso, guía, paseo, cuestionario, bloques y tutor. Acceso y registro utilizan su propio folio. Diálogos, menús inferiores, formularios, avisos, estados vacíos, errores y carga comparten tokens.

Los componentes Radix gestionan el foco y Escape en diálogos y menús. Los campos de acceso tienen etiquetas y autocompletado; la navegación expone la ruta actual. El tamaño de bloque utiliza un selector funcional.

## Verificación reproducible

Desde `frontend`: `npm run lint`, `npm run test`, `npm run build`; el build incluye TypeScript. Para navegador: arrancar `npm run dev -- --port 3000` y ejecutar `npm run e2e`. `e2e/paper-interface.spec.ts` intercepta únicamente `/api/` en el navegador con datos locales; nunca utiliza cuentas o datos reales. La variable opcional `LOOPDECK_SCREENSHOTS` guarda las capturas fuera del repositorio.

Desde `backend`: `./mvnw clean verify`. En Docker Desktop con API mínima 1.44, el cliente antiguo de Testcontainers necesita `-DargLine=-Dapi.version=1.44`; esta opción permite ejecutar también PostgreSQL sin omitir la prueba de integración. Desde la raíz: `docker build -t loopdeck-paper-check .`.

El parser Babel de ESLint permite analizar TypeScript 7 sin forzar peers incompatibles. La regla local marca las referencias de tipos para que `no-unused-vars` no confunda importaciones usadas exclusivamente en anotaciones con código sin usar. Se excluyen solo artefactos generados.

La revisión de navegador utiliza fixtures: no acredita la disponibilidad de Google OAuth, Gemini, búsquedas externas ni documentos reales del usuario.
