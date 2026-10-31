# Fiabilidad y rendimiento de LoopDeck

Petición: resolver los pendientes comprobados de backend, datos y acciones, de mayor a menor gravedad. Base: `377ebd7`. Conservar contratos existentes y el aislamiento entre cuentas. No cambiar planes de pago ni credenciales sin una necesidad comprobada.

## Trabajo

- [x] Documentos: corregir nombre, límites multipart, tipo de respuesta y pruebas de subida/descarga.
- [x] Datos coherentes: invalidar cachés después de mutaciones y vaciar datos de otra cuenta al cambiar sesión.
- [x] Revisión y deshacer: confirmar escrituras antes de avanzar, evitar duplicados/pérdidas y validar entradas; restauración desde una instantánea del servidor.
- [x] Validar propiedad de padres de mazos, JSON/tipos de notas y restauraciones. Corregir notas cloze y estados de notas reversibles.
- [x] Guardado masivo: endpoint actual por lotes, validación atómica y escritura agrupada; progreso y recuperación de errores.
- [x] Explorador: paginación con búsqueda y etiquetas en servidor, orden estable y estados limitados a la página. Conservar la ruta antigua.
- [x] Repaso: bloques pequeños sin omitir pendientes, respetando orden global y deshacer.
- [x] SQL: medir planes con datos locales reproducibles, añadir solo índices justificados y utilizar cascadas ya existentes en borrados.
- [x] Rendimiento operativo: revisar arranque, configuración y consultas lentas sin trasladar coste a la primera acción ni contratar servicios.
- [x] Revisión independiente, tests de regresión e integración, lint, build, Maven verify, Docker, secretos y diff.
Entrega: commit y PR tras las verificaciones locales. El resultado de CI, la integración y el despliegue se comprueban en GitHub y Render; la versión y los recursos PWA publicados se contrastan por HTTP.

## Verificación

Pruebas de contrato para documentos/importación/validación, PostgreSQL real mediante Testcontainers para paginación, agregados, cloze, borrado y revisiones. Fixtures de navegador para cachés, lotes, páginas, errores y sesiones que superan un bloque. Los benchmarks usan una base local desechable; sus tiempos no se presentan como mediciones de producción.

## Hallazgos adicionales de revisión independiente

La revisión inicial detectó: padre de mazo de otra cuenta, secreto público por defecto si falta configuración, restauración arbitraria, carrera en revisiones, JSON válido con forma incompatible, orden aplicado después del límite, estados reversibles no deterministas y ordinal cloze incorrecto. Cada corrección necesita una prueba específica. La configuración efectiva de producción se comprobará sin revelar secretos antes de endurecer el arranque.
