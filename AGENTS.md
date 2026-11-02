# LoopDeck

Aplicación de tarjetas: React/TypeScript/Vite en `frontend/`, Spring Boot/Maven en `backend/`, PostgreSQL y Flyway. Node 22+, Java 17. Desarrollo y comprobaciones: [CONTRIBUTING.md](CONTRIBUTING.md).

## Trabajo
- Avanza sin aprobación adicional dentro de la tarea pedida. No exijas aprobar cada plan.
- Comprueba rama, estado y diff al empezar; conserva trabajo previo y limita el cambio a la tarea.
- Reutiliza los patrones del proyecto. Usa ramas `codex/`, commits descriptivos y PR; commit y push después de los checks aplicables. Fusiona solo si se solicita.
- No fuerces pushes, saltes hooks ni hagas stage global. No limpies trabajo ajeno.

## Verificación proporcional
- Durante el desarrollo: prueba de regresión o tests concretos de lo que cambias.
- Al terminar: una validación final de la parte afectada, según CONTRIBUTING. Reutiliza resultados mientras no cambien código, configuración o dependencias que los invaliden.
- Frontend: build con TypeScript y tests de la parte afectada. El hook valida únicamente archivos staged; lint completo si cambia su configuración. Para cambios de interacción, E2E relevantes en local y suite completa en CI.
- Backend: `mvnw clean verify` una vez, sin un package previo redundante. Integración y migraciones requieren Docker.
- Docker: construir si cambian imágenes, contexto, dependencias o despliegue; no por cualquier ajuste de UI.
- Contratos API, autenticación, datos, dependencias o cambios transversales: amplía a ambos lados y sus integraciones.
- Documentación sin impacto ejecutable: revisar contenido, enlaces y diff. No activar builds por rutina.
- Un fallo aplicable bloquea commit/push. No elimines tests ni reduzcas assertions o umbrales para conseguir verde.
- CI usa rutas para seleccionar suites y cancela ejecuciones obsoletas. No esperes dos veces por contenido idéntico salvo despliegue o integración nueva.

## Restricciones del proyecto
- No modificar migraciones Flyway compartidas; añade una nueva si hay una corrección.
- No introducir `any`, `@ts-ignore` o `eslint-disable` para esconder errores.
- No subir secretos, archivos .env reales, cachés, builds o material temporal.
- Mantener aislamiento por usuario, idempotencia de repasos y restauración del historial.
- Seguridad: errores públicos controlados, secretos por entorno y configuración que falle de forma segura.
- En UI, conservar la identidad de papel y tinta, accesibilidad, móvil y estados de error. No introducir rediseños ajenos al encargo.
