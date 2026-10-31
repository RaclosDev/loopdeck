# Preparación de dos tarjetas por mazo

Objetivo autorizado: preparar en segundo plano dos tarjetas por mazo después de mostrar la aplicación, sin bloquear el inicio ni descargar las colas completas.

## Diseño

- En las pantallas de colección y selección de mazo, esperar a tener mazos/recuentos y dejar 300 ms para el pintado. Priorizar los mazos visibles y el seleccionado; preparar grupos de 12, secuencialmente. Las pantallas de repaso y edición detienen esa preparación.
- `POST /api/study/prepare`: exige autenticación y propiedad de todos los IDs, limita 12 entradas, aplica el orden global y devuelve como máximo dos tarjetas por mazo. Lectura lateral acotada, notas y recuentos agrupados. Las lecturas de tarjetas y contadores comparten instantánea REPEATABLE_READ.
- La preparación caduca como máximo a los 60 s o al siguiente vencimiento de una tarjeta activa. El cliente cuenta ese plazo desde el inicio de la petición para ser conservador con la latencia. Revisa la caché cada 5 s sin volver a consultar los mazos que siguen vigentes y pausa la preparación con la página oculta.
- Caché separada por cuenta/mazo/orden. Editar, importar o repasar cancela preparaciones pendientes e invalida el mazo afectado. Cambiar de cuenta limpia la caché y desmonta el estado local.
- Al abrir el repaso, mostrar las dos tarjetas preparadas e iniciar la carga del resto solo para ese mazo. Deduplicar tarjetas. Una escritura cancela esa lectura y avanza su versión para impedir que una respuesta tardía vuelva a insertar tarjetas repasadas.
- Al agotar las dos tarjetas, consultar pendientes después de confirmar las escrituras. No declarar completado a partir de una respuesta vacía que aún indica pendientes. Los errores de preparación permiten el acceso normal; los errores de recarga se muestran y permiten reintentar.

## Verificación

PostgreSQL real para límites, propiedad, orden, cuentas, vencimiento y mazos vacíos. Pruebas de caché, cancelación, StrictMode, continuación mientras llega el bloque y respuesta tardía tras repasar. Navegador con 25 mazos (grupos 12/12/1) y prueba de entrada con el bloque completo retenido: la primera tarjeta debe verse antes de liberarlo. Suites completas, lint, build, Docker, revisión independiente y CI antes de integrar.

La preparación anticipa trabajo y aprovecha el tiempo antes de la pulsación; no garantiza acceso instantáneo si aún no ha terminado, ha caducado o el alojamiento está arrancando.

Resultado local: 47 pruebas backend, 38 unitarias frontend y 34 Playwright correctas. Lint, build y Docker correctos. Imagen empaquetada comprobada por HTTP con PostgreSQL temporal: registro, importación de mazos y preparación autenticada agrupada de exactamente dos tarjetas por mazo.
