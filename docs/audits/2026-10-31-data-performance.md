# Fiabilidad, datos y rendimiento · 31 de octubre de 2026

Base revisada: `377ebd7`. Trabajo en `codex/backend-data-performance`.

## Problemas corregidos

- Las revisiones avanzaban visualmente antes de guardarse: un fallo perdía la tarjeta de la sesión. Ahora se confirma la escritura, se bloquean dobles pulsaciones y se reintenta el mismo identificador y payload.
- Dos revisiones concurrentes podían sobrescribir la planificación. El servidor bloquea la tarjeta, inserta acciones únicas y conserva instantáneas para deshacer. Una acción anulada permanece identificable para rechazar reintentos tardíos. Las colisiones entre tarjetas revierten la transacción y responden 409.
- La restauración aceptaba una planificación arbitraria del cliente. Ahora restaura exclusivamente la instantánea del servidor; la PWA anterior mantiene un camino compatible con comprobación exacta y rechazo de casos ambiguos.
- Se admitían padres de mazos ajenos, JSON con forma incompatible y estados reversibles dependientes del orden SQL. Hay validación de propiedad, contenido y agregación determinista.
- Cloze creaba una sola tarjeta con ordinal0. Las notas nuevas y editadas generan los índices reales; V20 conserva la tarjeta histórica y añade los huecos faltantes de las notas antiguas que tenían una única tarjeta0. Las notas malformadas o con múltiples tarjetas previas se conservan sin reparación automática.
- Los botones «Difícil» y de reaprendizaje mostraban intervalos distintos de los guardados. Se han alineado y añadido regresiones.
- La importación hacía peticiones por tarjeta y podía dejar un resultado parcial sin recuperación. El cliente valida toda la generación, guarda bloques de 100 y mantiene progreso e identificadores al reintentar. El backend valida bloques de hasta 500 antes de JDBC batch; las plantillas usan la misma escritura dentro de una transacción.
- El explorador descargaba todas las notas y sus estados. Ahora pide 25 por página, filtra en servidor y consulta estados solo para esas notas. Las etiquetas se consultan separadamente y se cachean. La edición de huecos conserva el campo `text`.
- El repaso descargaba hasta 1000 y ordenaba después del límite. Ahora ordena globalmente antes de pedir bloques de 50 y consulta de nuevo al terminar cada bloque; las estadísticas de sesión sobreviven a los bloques y a sus reintentos.
- Las mutaciones dejaban contadores obsoletos y el cambio de cuenta conservaba cachés y estado local. Las claves incluyen la cuenta, se invalidan los consumidores afectados y se desmontan las rutas al cambiar de identidad.
- La subida de documentos devolvía un contrato incompatible y tenía un saneado de nombre defectuoso. Respuesta, caracteres, extensiones y límite de 15 MB están cubiertos por pruebas.
- El secreto JWT público de reserva podía habilitar un despliegue mal configurado. Se verificó mediante API que producción ya tiene un secreto propio válido, sin mostrarlo ni cambiarlo. Ahora su ausencia o el placeholder impiden arrancar.
- Entradas malformadas producían errores 500 o mostraban detalles internos. Se normalizan respuestas 400/403/409/413 y se registran peticiones lentas por plantilla de ruta, estado, duración y correlación, sin consultas, tokens ni contenido de notas.

## Mediciones SQL locales

PostgreSQL15 Alpine desechable sin red, 200.000 notas, 200.000 tarjetas, 200 mazos, 1000 notas por mazo, contenido de respuesta repetido 20 veces y estados/suspensión repartidos por módulo. `ANALYZE`; una muestra de calentamiento y mediana de cinco ejecuciones de `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`. Después se añadieron 200.000 revisiones repartidas entre 200 tarjetas para medir la última revisión activa. Son tiempos de ejecución SQL local; no incluyen HTTP, renderizado ni producción.

| Consulta | Antes | Después | Cambio |
| --- | ---: | ---: | --- |
| Primeras25 notas por fecha/id, filtro de mazo/cuenta y búsqueda vacía | 2,764ms | 0,174ms | `notes(deck_id,created_at DESC,id DESC)` |
| Agregado de tarjetas/notas/nuevas de un mazo | 15,975ms | 3,501ms | `cards(deck_id)` |
| Última revisión activa por tarjeta | 0,133ms | 0,039ms | índice parcial por tarjeta/fecha/id, `undone=false` |

V19 incorpora los índices de mazos/páginas; V17 incorpora el de revisiones activas. Los borrados usan las cascadas existentes, comprobadas con PostgreSQL y aislamiento entre cuentas. Los planes completos quedan como artefacto local de verificación, fuera de Git.

## Contratos y operación

Las rutas antiguas de notas y estudio conservan sus respuestas de lista. Las nuevas rutas son `/api/decks/{id}/notes/page`, `/notes/tags` y `/study/batch`. `requestId`, `reviewId` e `Idempotency-Key` permiten reintentos del cliente actualizado; los clientes anteriores siguen creando notas y revisiones.

Las migraciones V17–V20 son nuevas; no se cambia ninguna migración aplicada. El esquema se amplía: volver a una imagen anterior no requiere borrar las columnas/tablas nuevas. La reparación cloze conserva identificadores e historial y no debe revertirse eliminando tarjetas.

El servicio de Render sigue en el plan Free. En la revisión previa el arranque registrado fue151,201s; las muestras públicas calientes rondaban85–96ms después de la primera petición. No son mediciones de consultas autenticadas. La suspensión tras inactividad y los recursos del plan pueden seguir causando esperas al despertar; no se ha cambiado el plan ni activado inicialización diferida para trasladar ese coste a una acción posterior.

## Validación

- PostgreSQL real: propiedad, cascadas, cloze, importaciones atómicas e idempotentes, páginas, filtros literales/etiquetas y orden global; revisiones y deshacer concurrentes, UUID equivalentes y colisiones entre tarjetas.
- Frontend: cambio de cuenta/cachés, análisis seguro de notas, cloze, recuperación de importaciones y sesiones; navegador responsive, accesibilidad, errores, páginas y una sesión completa de 51 tarjetas.
- Build, lint, pruebas unitarias, Maven clean verify, construcción Docker y auditoría npm de dependencias de producción.
- CI incorpora lint y Playwright además de los checks anteriores. La prueba de Google/iPhone en producción requiere el dispositivo del usuario; no se considera realizada por las pruebas locales.

Resultado local: 46 pruebas backend, 29 pruebas unitarias frontend y 30 pruebas Playwright correctas; lint, build, Docker y auditoría npm de producción correctos (0 vulnerabilidades reportadas). La imagen empaquetada se arrancó con una base desechable y se verificaron por HTTP registro, creación autenticada, páginas cloze, bloques, reintentos de revisión/deshacer y borrado.
