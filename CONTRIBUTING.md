# Desarrollo de LoopDeck

Requisitos: Node.js 22+, Java 17 y Docker en ejecución para PostgreSQL y los tests de integración.

## Configuración

El recorrido siguiente ejecuta PostgreSQL en Docker y la API y el frontend en sus servidores de desarrollo.

1. Desde la raíz, ejecuta `npm ci` para instalar los hooks del repositorio.
2. Copia `.env.example` a `.env` y sustituye los placeholders. `JWT_SECRET` es obligatorio, debe tener al menos 32 bytes y no puede comenzar por `CHANGE_ME`. Puedes generar un valor con `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Usa también una contraseña propia para PostgreSQL.
3. Arranca la base de datos con `docker compose up -d postgres`.
4. Carga las variables en la terminal donde ejecutarás Java; Spring no lee `.env` automáticamente. Usa uno de los bloques siguientes desde la raíz.

**PowerShell:**

```powershell
Get-Content .env | ForEach-Object {
    if ($_ -match '^([A-Z_][A-Z0-9_]*)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
}
$env:SPRING_DATASOURCE_URL = "jdbc:postgresql://localhost:$($env:POSTGRES_PORT)/$($env:POSTGRES_DB)"
$env:SPRING_DATASOURCE_USERNAME = $env:POSTGRES_USER
$env:SPRING_DATASOURCE_PASSWORD = $env:POSTGRES_PASSWORD
cd backend
.\mvnw.cmd spring-boot:run
```

**Bash:**

```bash
set -a
. ./.env
set +a
export SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:$POSTGRES_PORT/$POSTGRES_DB"
export SPRING_DATASOURCE_USERNAME="$POSTGRES_USER"
export SPRING_DATASOURCE_PASSWORD="$POSTGRES_PASSWORD"
cd backend
./mvnw spring-boot:run
```

Los ejemplos usan el formato `CLAVE=valor` de `.env.example`, sin comillas ni espacios alrededor de `=`. Si eliges valores con caracteres especiales del shell, expórtalos manualmente en lugar de cargar el archivo con Bash.

5. En otra terminal, entra en `frontend`, copia `.env.example` a `.env`, ejecuta `npm ci` y después `npm run dev`. Abre la URL que indique Vite (por defecto, `http://localhost:5173`). El ejemplo de CORS ya permite ese origen.
6. Crea una cuenta desde la app y añade un mazo o importa una plantilla para empezar a estudiar.

Puedes usar el registro con correo y contraseña sin configurar Google ni Gemini. Google requiere un client ID con los orígenes configurados. Gemini es necesario para las funciones de IA; no lo es para crear y repasar tarjetas manualmente.

Para construir la imagen unificada de producción, consulta el [Dockerfile de la raíz](Dockerfile) y la [descripción del despliegue](docs/ARCHITECTURE.md#construcción-y-entrega). Esta imagen necesita PostgreSQL y sus variables de entorno al ejecutarse.

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
