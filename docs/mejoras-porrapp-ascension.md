# Mejoras transversales de PorrApp y Ascension aplicables a LoopDeck

Recopilación de las mejoras no funcionales hechas en PorrApp y Ascension Tracker y de su estado en
LoopDeck. Fuentes: todas las sesiones de Claude de ambos proyectos, activas y archivadas (unas 55
conversaciones), y el historial de commits y PR de los dos repos hasta el 7 nov 2026. Quedan fuera las
funcionalidades propias de cada producto: modo entrenador, ligas, cuadros, IA de nutrición, etc.

Estados en LoopDeck: **Aplicada** (en este cambio), **Ya estaba**, **No aplica**, **Pendiente**
(requiere una decisión, acceso externo o un cambio propio).

## Resumen de lo que se hizo en PorrApp y Ascension

- **Auditorías completas** de seguridad, arquitectura, deuda técnica y usabilidad, con un informe en
  MD que se va marcando y se resuelve punto por punto en PR pequeños.
- **Seguridad:** IP real tras el proxy para el rate limit, límite de tamaño de los cuerpos JSON, sin
  valores por defecto inseguros en producción, comprobación de `Origin` en refresh y logout, cookies
  de sesión acotadas, emails normalizados con `Locale.ROOT`, `catch` acotados, CSP, push solo con las
  mismas claves.
- **Sesiones:** sesiones deslizantes con tope (90 días sin uso y un año en PorrApp), rotación con
  detección de reutilización, traspaso de la sesión de Safari a la app instalada en iPhone y llaves
  de acceso.
- **Calidad de backend:** ArchUnit para las capas, JaCoCo con umbral, respuestas tipadas en vez de
  `Map`, servicios por dominio, controladores sin repositorios, purgas programadas y código muerto
  eliminado.
- **CI/CD:** CodeQL, Dependabot, `npm audit`, acciones fijadas a SHA, knip, umbrales de cobertura,
  `jsx-a11y`, checksum del Maven wrapper, CI por rutas y fusión automática de los PR propios con
  borrado de rama.
- **Frontend y PWA:** splash inline con fundido y sin saltos de diseño (CLS de 0,30 a 0,0008),
  `sw.js` sin caché larga, caché por cuenta, guía de instalación en iPhone (Safari 26/27), FedCM en
  el botón de Google, diálogos accesibles, pasada antislop (sin emoji decorativos, 44 px táctiles,
  contraste AA).
- **SEO:** robots, sitemap, Search Console, canonical, Open Graph, Twitter, JSON-LD y favicon
  múltiplo de 48 px.
- **Stack alineado** entre proyectos: mismas versiones de herramientas y de Maven.

## 1. Seguridad

| Mejora (origen) | LoopDeck |
| --- | --- |
| IP del cliente para el rate limit (PorrApp #156, Ascension #193) | **Aplicada**: `ClientIp` usa el salto del proxy de confianza (`RATE_LIMIT_TRUSTED_PROXY_HOPS`, 1 por defecto), descarta valores con formato no válido, y la conexión real tiene un cubo 20 veces mayor como tope ante direcciones falsificadas. Antes se usaba el primer valor de `X-Forwarded-For`, que elige el cliente. El 429 pasa a ser JSON en español. |
| Límite de tamaño de los cuerpos JSON (PorrApp #156) | **Aplicada**: `RequestBodyLimitFilter` con 2 MB por defecto y 16 MB en importaciones (lotes con imágenes en base64), y 413 controlado. |
| Sin valores por defecto inseguros en prod (PorrApp #156) | **Aplicada**: el perfil prod ya no tiene `CHANGE_ME` ni usuario o base de datos por defecto. |
| Comprobación de `Origin` en `/refresh` y `/logout` (Ascension #199) | **Aplicada**: `TrustedOrigins` sobre la lista de CORS más el propio host. |
| Cookie de refresh acotada (Ascension #199) | **Aplicada**: path `/api/auth`, duración igual a la del token (antes 7 días frente a 30 en la base de datos) y borrado de la cookie antigua en `/`. |
| Sesiones deslizantes con tope (PorrApp #188) | **Aplicada**: cada renovación alarga la sesión 30 días, con un tope de un año desde el inicio (migración V22 con `created_at` e índices). |
| Purga programada (Ascension #192) | **Aplicada**: job diario que borra refresh tokens caducados. |
| Email normalizado con `Locale.ROOT` (Ascension #192 y #197) | **Aplicada**: `util/Emails` en registro, login y Google. El registro guardaba el email tal cual y el login lo buscaba en minúsculas, así que quien se registraba con mayúsculas no podía entrar. |
| `catch (Exception)` acotados (PorrApp #181, Ascension #201) | **Aplicada** en la verificación de Google, que además tiene tiempos de espera de 5 s y no falla con un 500 si a Google le falta un campo. |
| Caché del service worker por cuenta (PorrApp v3, Ascension) | **Aplicada**: el SW no guarda `/api/auth`, y `api-cache` se borra al cerrar sesión o cambiar de cuenta. |
| Rotación del refresh token con detección de reutilización (PorrApp v5, Ascension #192) | **No aplica por ahora**: LoopDeck no rota a propósito, por las carreras de la PWA y porque iOS copia la cookie de Safari a la app instalada. Rotar exigiría antes un traspaso de sesión como el de PorrApp #188. Está documentado en `ARCHITECTURE.md`. |
| Errores públicos controlados | **Ya estaba** (`GlobalExceptionHandler`, `SafeErrorsTest`). |
| HTML saneado | **Ya estaba** (`sanitizeHtml` con DOMPurify). |
| CSP estricta (PorrApp #114) | **Pendiente**: hay que revisar Google Sign-In, las fuentes, los blobs de documentos y las imágenes en base64. Merece un cambio propio. |

## 2. Backend: calidad y arquitectura

| Mejora (origen) | LoopDeck |
| --- | --- |
| ArchUnit para las capas (PorrApp #162) | **Aplicada**: `ArchitectureTest`. `UserController` ya no tiene el repositorio sin usar, `TemplateController` ya no busca el usuario en el repositorio, y la lógica de documentos pasa de `DeckController` a `DeckDocumentService`. |
| Puerta de cobertura JaCoCo (Ascension #192) | **Aplicada**: 58 % de líneas y 41 % de ramas, justo por debajo de lo medido (58,6 % y 42,1 %). Se arregla además el `argLine` de la CI, que habría desactivado el agente. |
| Respuestas tipadas en vez de `Map` (Ascension #200) | **Aplicada** en `AiController`, `/api/auth/config` y la información de documentos. El JSON no cambia. |
| `RuntimeException` genéricas | **Aplicada**: `UncheckedIOException` e `IllegalStateException` con su motivo. |
| Servicios por dominio (PorrApp #173) | **No aplica**: con unos 15 archivos en `service`, el paquete plano se lee bien. |
| Fechas en UTC (PorrApp #125) | **Ya estaba** (`jdbc.time_zone: UTC` e `Instant`). |
| Migraciones Flyway agrupadas (PorrApp #146) | **No aplica**: AGENTS.md prohíbe modificar las migraciones compartidas. |

## 3. CI/CD y herramientas

| Mejora (origen) | LoopDeck |
| --- | --- |
| CI por rutas y cancelación de ejecuciones obsoletas (Ascension v4) | **Ya estaba**. |
| CodeQL (PorrApp #156) | **Aplicada**: Java y TypeScript, en PR, en `main` y cada semana. |
| Dependabot | **Aplicada**: npm, Maven, Actions y Docker, cada semana. |
| `npm audit --audit-level=high` (PorrApp #156) | **Aplicada** sobre las dependencias de producción. |
| Acciones fijadas a SHA (PorrApp #149) | **Aplicada**, con las mismas versiones que PorrApp. |
| knip (PorrApp #158, Ascension #203) | **Aplicada**. Ha encontrado y se han borrado: `authApi`, `usersApi` (llamaba a un endpoint que no existe), `uid`, cinco tipos, el componente `alert-dialog` y las dependencias `jszip`, `mammoth`, `@radix-ui/react-alert-dialog` y `@types/dompurify`. Ahora se declaran `@eslint/js` y los módulos de workbox que importa `sw.js`. |
| Umbrales de cobertura de Vitest | **Aplicada** al nivel medido (19 % de líneas). Es bajo y conviene subirlo con tests. |
| `eslint-plugin-jsx-a11y` (PorrApp #156) | **Aplicada**, con 22 fallos corregidos: etiquetas sin control asociado, el botón de quitar etiqueta (un `span` al que no se llegaba con teclado) y fondos de diálogo como presentación. |
| Fusión automática de PR propios (PorrApp #143/#145, Ascension v5) | **Aplicada**: `automerge.yml` (squash, borrado de rama y CI de `main`). Solo actúa cuando el workflow ya está en `main`. **Ojo**: AGENTS.md dice todavía «Fusiona solo si se solicita»; hay que actualizar esa línea a mano. |
| Maven alineado y con checksum (PorrApp #149 y #156) | **Aplicada**: Maven 3.10.0 con `distributionSha256Sum`, como PorrApp. `.gitattributes` fuerza LF en `mvnw` y en sus propiedades. |

## 4. Docker y despliegue

| Mejora (origen) | LoopDeck |
| --- | --- |
| Contenedores sin root (PorrApp v3) | **Aplicada** en la imagen unificada y en la del backend (comprobado: `uid=100(app)`). |
| Puertos solo en `127.0.0.1` en compose (PorrApp #156) | **Aplicada** para PostgreSQL y la API. Antes se publicaban en todas las interfaces. |
| `sw.js` y manifiesto sin caché larga (PorrApp #63) | **Aplicada** en nginx y en Spring: `no-cache` en `sw.js`, `manifest.json` e `index.html`, y un año `immutable` en `/assets`. |
| Node 22 en la imagen del frontend | **Aplicada**: usaba Node 20 aunque `engines` pide 22. |

## 5. Frontend, PWA y experiencia

| Mejora (origen) | LoopDeck |
| --- | --- |
| Splash inline y fundido (PorrApp #198/#199) | **Aplicada**: `index.html` pinta el fondo del tema antes del CSS y muestra el icono solo si el arranque pasa de 500 ms. `hideBootSplash` lo retira con un fundido de 200 ms cuando llegan las fuentes (como mucho 400 ms) y respeta el movimiento reducido. |
| FedCM en el botón de Google (PorrApp #192) | **Aplicada** (`use_fedcm_for_button`). |
| Pasos de instalación en iPhone para Safari 26/27 (PorrApp #185/#189) | **Aplicada**: el aviso de instalar menciona «Ver más» y usa un icono en lugar del emoji. |
| Sin emoji decorativos (antislop, PorrApp #151) | **Aplicada**: era el único que quedaba. |
| Diálogos accesibles (PorrApp #151/#163) | **Ya estaba** (Radix). |
| Guía de instalación con flecha y navegadores dentro de otras apps (PorrApp #185) | **Pendiente**: es funcionalidad nueva. |
| Llaves de acceso y traspaso de sesión de Safari a la app (PorrApp #188/#194/#201) | **Pendiente**: es funcionalidad nueva y va unida a la decisión sobre la rotación. |
| Borrado de cuenta y descarga de datos (RGPD, PorrApp #113/#122, Ascension #206) | **Pendiente**: LoopDeck no tiene página de privacidad. Conviene hacerlo en una tarea propia junto con el aviso legal. |
| Pasada antislop completa (44 px táctiles, contraste) | **Pendiente**: requiere revisar la interfaz en el navegador. |

## 6. SEO y presencia

| Mejora (origen) | LoopDeck |
| --- | --- |
| robots, sitemap y Search Console | **Ya estaba** (#16). |
| Canonical, Open Graph, Twitter y JSON-LD `WebSite` + `WebApplication` (PorrApp #190/#195/#200) | **Aplicada**, con título y descripción que dicen que es gratis y nombran FSRS. Solo `/` es público, así que el canonical fijo es correcto. |
| Favicon múltiplo de 48 px (PorrApp #200) | **Aplicada**: además del `.ico` de 16, 32 y 48 px, se enlaza el PNG de 192 px. |
| Imagen social de 1200×630 (PorrApp #152) | **Pendiente**: ahora se usa el icono de 512 px; falta una captura con la portada. |
| Google Analytics con consentimiento (PorrApp #190) | **Pendiente**: necesita un ID de medición de LoopDeck. |
| README para recruiters (ambos) | **Ya estaba**. |

## 7. Stack alineado

PorrApp y Ascension usan Java 21 y Spring Boot 4.1.2 (y TypeScript 6; LoopDeck ya va en la 7).
LoopDeck sigue con Spring Boot 3.3.0, Java 17 y springdoc 2.5. **Pendiente**: subir de versión es un cambio de dependencias con
impacto en ambos lados (Jackson 3 y Spring Security 7) y conviene hacerlo en un PR propio. En este
cambio solo se alinean Maven, Node en Docker y las versiones de las acciones de CI.

## Verificación de este cambio

- Backend: `mvnw clean verify` con Testcontainers en verde y la puerta de JaCoCo superada.
- Frontend: lint con `jsx-a11y`, knip, `tsc`, 47 tests con cobertura, build y 37 E2E de Playwright en verde.
- Docker: la imagen unificada se construye y arranca como usuario `app`.
