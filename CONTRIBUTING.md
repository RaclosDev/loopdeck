# Desarrollo de LoopDeck

Requisitos: Node.js 22+, Java 17 y Docker en ejecución para PostgreSQL y los tests de integración.

## Configuración

1. Copia `.env.example` a `.env` y sustituye los placeholders. `JWT_SECRET` es obligatorio, debe tener al menos 32 bytes y no puede comenzar por `CHANGE_ME`. Genera un valor aleatorio propio; no reutilices el de las pruebas.
2. `docker compose up -d` construye backend y frontend y arranca PostgreSQL. Para desarrollo nativo puedes arrancar solo `docker compose up -d postgres`.
3. Si ejecutas Java fuera de Compose, exporta las variables de `.env` a tu terminal: Spring no carga ese archivo automáticamente. Configura `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME` y `SPRING_DATASOURCE_PASSWORD` para la base local.
4. En `backend`, ejecuta `./mvnw spring-boot:run` (`.\mvnw.cmd spring-boot:run` en Windows).
5. En `frontend`, ejecuta `npm ci` y `npm run dev`. Configura las variables de `frontend/.env.example` y permite ese origen en `CORS_ALLOWED_ORIGINS`.

Google requiere un client ID con los orígenes configurados. Gemini es necesario para las funciones de IA; no lo es para crear y repasar tarjetas manualmente.

## Verificación según el cambio

Durante el desarrollo ejecuta los tests de regresión pertinentes. Al terminar, valida una vez el alcance afectado; repite solo las comprobaciones invalidadas por nuevos cambios o fallos.

| Cambio                                                  | Comprobación local final                                                                                                      |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Frontend                                                | En `frontend`: `npm test` y `npm run build` (incluye TypeScript). Para interacción, `npm run e2e -- --grep 'flujo afectado'`. |
| Backend                                                 | En `backend`: `./mvnw clean verify`, que incluye tests, integración y empaquetado. No hace falta un `package` adicional.      |
| Contratos API, autenticación o cambios transversales    | Ambas partes y sus integraciones afectadas.                                                                                   |
| Docker, contexto de imagen o dependencias de producción | `docker build -t loopdeck:local .` desde la raíz.                                                                             |
| CI o selector de rutas                                  | `npm run test:workflow`, revisión del workflow y los checks que este cambie.                                                  |
| Solo documentación                                      | Revisión del texto, enlaces y `git diff --check`; no builds de aplicación.                                                    |

El hook formatea y hace lint **solo de los archivos staged**. Ejecuta `npm run lint` completo en frontend si cambias sus reglas o para investigar un fallo; no lo repitas por rutina antes del hook.

Los tests backend arrancan PostgreSQL con Testcontainers. En Docker Desktop que requiera API 1.44: `.\mvnw.cmd '-DargLine=-Dapi.version=1.44' clean verify`. Para Playwright, instala Chromium con `npx playwright install chromium`.

La CI conserva lint, tests y build completos de cada parte afectada; ejecuta toda la suite de navegador cuando afecta al frontend. Los cambios de contrato activan ambos lados. Las rutas desconocidas activan todos los checks. Los cambios exclusivos de documentación no arrancan Java, navegadores ni Docker. El selector tiene tests propios y cancela ejecuciones antiguas de la misma PR o rama.

No incluyas secretos, `.env`, artefactos compilados ni cambios ajenos. Usa ramas, PR y Conventional Commits. Un check aplicable fallido bloquea commit y push; no reduzcas tests ni assertions para conseguir verde.

Las migraciones compartidas se conservan: cualquier reparación del esquema o de los datos necesita una migración nueva.
