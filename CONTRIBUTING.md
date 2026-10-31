# Desarrollo de LoopDeck

Requisitos: Node.js 22+, Java 17 y Docker en ejecución para PostgreSQL y los tests de integración.

## Configuración

1. Copia `.env.example` a `.env` y sustituye los placeholders. `JWT_SECRET` es obligatorio, debe tener al menos 32 bytes y no puede comenzar por `CHANGE_ME`. Genera un valor aleatorio propio; no reutilices el de las pruebas.
2. `docker compose up -d` construye backend y frontend y arranca PostgreSQL. Para desarrollo nativo puedes arrancar solo `docker compose up -d postgres`.
3. Si ejecutas Java fuera de Compose, exporta las variables de `.env` a tu terminal: Spring no carga ese archivo automáticamente. Configura `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME` y `SPRING_DATASOURCE_PASSWORD` para la base local.
4. En `backend`, ejecuta `./mvnw spring-boot:run` (`.\mvnw.cmd spring-boot:run` en Windows).
5. En `frontend`, ejecuta `npm ci` y `npm run dev`. Configura las variables de `frontend/.env.example` y permite ese origen en `CORS_ALLOWED_ORIGINS`.

Google requiere un client ID con los orígenes configurados. Gemini es necesario para las funciones de IA; no lo es para crear y repasar tarjetas manualmente.

## Verificación antes del commit

- Backend: `./mvnw clean verify`. Los tests de integración arrancan PostgreSQL con Testcontainers. En Docker Desktop que requiera API 1.44: `.\mvnw.cmd '-DargLine=-Dapi.version=1.44' clean verify`.
- Frontend: `npm run lint`, `npm test`, `npm run build` y `npm run e2e` (instala Chromium con `npx playwright install chromium`).
- Imagen de producción: `docker build -t loopdeck:local .` desde la raíz.
- No incluyas secretos, `.env`, artefactos compilados ni cambios ajenos. Usa ramas, PR y Conventional Commits.

Las migraciones compartidas se conservan: cualquier reparación del esquema o de los datos necesita una migración nueva.
