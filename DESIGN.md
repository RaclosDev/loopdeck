# LoopDeck: papel y tinta

La interfaz comparte la familia visual de PorrApp, conservando los flujos y la marca de LoopDeck. Energía 2, ritmo 2, movimiento 1.

La portada pública presenta el producto con un cartel, una tarjeta de ejemplo interactiva identificada como tal y el acceso integrado. Los enlaces llevan al cuaderno explicativo o al formulario, sin navegación ficticia. La cuadrícula de mazos y la creación rápida incorporadas en `main` se conservan dentro de la identidad de papel.

## Decisiones

- Icono: fichas de papel, flecha gruesa de repaso y cinta centrada, en tres colores. El SVG es el original editable; el trazo vectorial mantiene extremos redondeados. Los PNG tienen fondo opaco deliberadamente para iOS y la máscara de Android, con el símbolo dentro de la zona central segura. Los nombres nuevos evitan reutilizar la caché del icono anterior. El manifest público es la única fuente de instalación; se desactiva el manifest genérico adicional de VitePWA.

- Fondo azul oscuro `#0f172a`: separa la navegación del cuaderno de trabajo. El tema claro conserva el papel y utiliza una pared gris cálida.
- Papel `#f3ecdc`, tinta `#111827` y acento `#0b5f74`: reutilizan la identidad de la referencia y permiten leer durante sesiones largas.
- Anton para títulos y Permanent Marker para anotaciones: distinguen cartel y rotulador; Inter mantiene legibles las preguntas, respuestas y formularios.
- Textura PNG tenue y reutilizable: conserva el grano sin recalcular filtros SVG durante el repintado.
- Cinta amarilla: identifica cada hoja de mazo y el acceso; su centro permanece al 50%, con inclinación aleatoria de −6° a 6° estable durante la vida del elemento.
- Bordes pequeños, sombras desplazadas y pestañas de tinta: representan papel y fichas, sin superficies de cristal.
- Mazos y Centro de Estudio: hojas independientes sobre la pared, con 32 px entre mazos, cantos apilados y títulos de rotulador. Referencia concreta: la fase de grupos de PorrApp, donde cada grupo ocupa su propia hoja. El texto permanece recto.
- Nuevas, Aprendiendo y Revisión mantienen el mismo orden, nombre completo y color en cada mazo y en su centro. Las filas tienen fondo, borde y espacio propios. «Para hoy» resume todos los mazos; el total del mazo cuenta tarjetas, incluidas las que todavía no toca repasar.
- Cada método de estudio ocupa una hoja enlazada con teclado y ratón. El repaso espaciado tiene prioridad; los apuntes pertenecen al resumen del mazo.
- Los recuentos pendientes de cargar o fallidos nunca se convierten en cero ni en «Al día». Carga, error con reintento y mazo vacío tienen estados propios.
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

La separación se verifica con tres mazos, nombres largos, recuentos distintos y un mazo vacío, a 320, 390 y 1440 px. Se comprueban el espacio entre hojas, contraste, ausencia de desbordamiento, rutas por mazo y errores de recuentos. El resto de pantallas conserva su folio de trabajo y se incluye en la revisión de regresiones.
