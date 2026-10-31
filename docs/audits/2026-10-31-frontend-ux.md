# Auditoría UX/UI · 31 de octubre de 2026

Alcance: portada y acceso; mazos; Centro de Estudio; añadir, explorar, estadísticas, ajustes y los seis modos de estudio. Evidencia: código, capturas y pruebas de navegador con datos locales. No se modifican tarjetas reales.

## Hallazgos corregidos

| Prioridad | Problema observado | Corrección |
| --- | --- | --- |
| Alta | Un mazo de dos líneas medía 445 px de alto a 390 px de ancho. | Estados en tres columnas separadas, márgenes menores, cuadrícula adaptable y una sola acción de creación. Resultado: 249 px en la misma muestra (44 % menos). El test exige ≤300 px. |
| Alta | El editor imponía columnas de 350 px dentro de una pantalla menor. El overflow oculto disimulaba controles recortados. | Columnas limitadas al ancho disponible, herramientas ajustadas y comprobación de los límites reales de los controles. |
| Alta | El explorador sin mazos seguía cargando. Añadir y estadísticas confundían fallos con ausencia de datos. | Estados diferenciados con reintento o enlace a Mis mazos. Un mazo vacío ofrece añadir tarjetas antes de elegir modos. Añadir reutiliza la consulta cacheada. |
| Alta | Estadísticas presentaba recuentos disponibles como distribución de toda la colección. | Totales separados de las tarjetas disponibles hoy. Se elimina la gráfica engañosa y no se inventa el número de notas. |
| Alta | La barra lateral fuera de pantalla seguía expuesta al teclado y la accesibilidad en móvil. | Se oculta también de la navegación accesible. |
| Alta | El lector de pantalla podía leer ambas caras de una ficha. | Solo se expone la cara visible, con prueba de regresión. |
| Alta | Los modos de estudio podían mostrar un mazo vacío o una pantalla sin contenido tras un fallo de red. | Error explícito, reintento y regreso al mazo en los seis modos. |
| Media | Filtros pequeños, nombres largos desbordados, icono de búsqueda solapado y etiquetas que coincidían parcialmente. | Selectores etiquetados, mazo en la URL, etiquetas exactas, espacio para el icono y texto que envuelve líneas. |
| Media | Folios estirados y vista previa vacía de al menos 400 px. | Folios ajustados al contenido y vista previa de al menos 180 px. |
| Media | Cabeceras con texto genérico, títulos semánticos ausentes y navegación inconsistente en estudio. | Cabeceras compactas, un título principal y marco de estudio común. |
| Media | El repaso añadía una ventana completa a los márgenes externos; calificaciones desproporcionadas. | Altura ajustada y controles compactos conservando objetivos táctiles de 44 px. |
| Media | El interceptor de enlaces anulaba gestos modificados y las casillas tenían objetivos pequeños. | Se respetan Ctrl/Cmd/Shift/Alt y descargas. La fila completa del ajuste activa la casilla y muestra foco. |
| Media | La barra inferior persistía al enfocar los editores enriquecidos. | Se oculta durante la edición de frente y dorso. |

## Verificación

Listado con tres mazos, nombres largos, ceros y estados diferentes a 320, 390, 820 y 1440 px. Editor a 320, 390 y 820 px. Todas las rutas de la muestra se comprueban a 390 y 1440 px: contraste AA, errores de ejecución, desbordamiento, un h1 y acciones por mazo. Se verifican menús, teclado, diálogos, temas, estados vacíos, errores y reintentos.

`frontend/e2e/paper-interface.spec.ts` contiene las regresiones. `LOOPDECK_SCREENSHOTS` guarda capturas y medidas fuera del repositorio. Se ejecutan lint, TypeScript/Vite, pruebas unitarias, Maven verify y Docker build antes de publicar.

## Límites

Las pruebas usan Chromium y fixtures. No sustituyen pruebas con usuarios ni certifican VoiceOver/Safari en un iPhone físico, Google, respuestas de IA o documentos privados. No se modifica la autenticación ni los algoritmos de estudio.
