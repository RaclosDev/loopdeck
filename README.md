<p align="center">
  <img src="frontend/public/icon-512x512.png" alt="Loopdeck" width="128">
</p>

<p align="center">
  <b>PWA full-stack de flashcards y spaced repetition con orquestación de IA y rendimiento O(1).</b>
</p>

<p align="center">
  <img alt="CI" src="https://github.com/RaclosDev/loopdeck/actions/workflows/build.yml/badge.svg">
  <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg">
  <img alt="Java 17" src="https://img.shields.io/badge/Java-17-orange.svg">
  <img alt="Spring Boot 3.3" src="https://img.shields.io/badge/Spring%20Boot-3.3-6DB33F.svg">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-61DAFB.svg">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6.svg">
  <img alt="PWA" src="https://img.shields.io/badge/PWA-ready-5A0FC8.svg">
</p>

## Descripción

Loopdeck (anteriormente FlashForge) es una aplicación PWA (instalable en móvil y escritorio) de tarjetas de estudio inteligente. Utiliza el algoritmo SM-2 (Spaced Repetition) para planificar los repasos y garantizar la retención a largo plazo. Combina rendimiento empresarial (bases de datos desnormalizadas O(1), cachés locales con React Query) con orquestación de Inteligencia Artificial (Google Gemini) para generar tarjetas de estudio, buscar explicaciones y procesar documentos de texto.

Este repositorio está desarrollado con la misma **Arquitectura Base (Ascension Tracker Platform)**, estandarizando componentes UI, flujos de seguridad JWT HttpOnly y despliegue Dockerizado.

## Arquitectura Empresarial (FAANG-Ready)

### 🚀 Rendimiento y Base de Datos (O(1))
- Las tarjetas están desnormalizadas (inyectando \deck_id\) permitiendo que el motor de repasos diarios (CardRepository) calcule las tarjetas pendientes en coste computacional **O(1)**, eliminando JOINs masivos y garantizando escalabilidad a millones de registros.
- \@Transactional(readOnly = true)\ en los servicios de lectura para evitar presión de memoria (*Dirty Checking*) en Hibernate.

### 🤖 Integración GenAI Robusta
- Integración nativa con **Google Gemini** a través del moderno \RestClient\ de Spring Boot 3.
- Incluye políticas de resiliencia (Timeouts explícitos de Conexión y Lectura) para evitar el colapso de hilos del servidor (*Thread Exhaustion*).
- Capacidad de procesamiento masivo: Importa archivos DOCX y genera definiciones masivas mediante prompts enriquecidos de IA.

### 🛡️ Seguridad y Autenticación
- Arquitectura Zero-Trust: Los Refresh Tokens se almacenan en **cookies HttpOnly** previniendo vectores de ataque XSS.
- Validaciones a nivel de servicio para mitigar vulnerabilidades IDOR (Insecure Direct Object Reference) garantizando que los usuarios no puedan acceder ni modificar tarjetas de otros mazos mediante fuerza bruta de URLs.

### 🧪 Testing e Infraestructura
- **Backend:** Testcontainers levanta instancias reales de PostgreSQL efímeras para garantizar que los test de integración interactúan con el motor de base de datos de producción (evitando los falsos positivos de H2).
- **Frontend:** Cobertura de tests E2E con **Playwright** y tests unitarios de componentes con **Vitest + Testing Library**.
- **DevOps:** GitHub Actions configurado para CI/CD continuo, OpenAPI/Swagger para auto-documentación y Husky + lint-staged para asegurar la calidad de código en el pre-commit.

## Funcionalidades Core

### 🧠 Motor de Estudio (SM-2)
- Tarjetas Básicas, Reversibles y de tipo Cloze (Huecos).
- Animaciones 3D nativas con CSS.
- Navegación por teclado (Espacio para girar, 1-4 para evaluar el repaso).
- **Optimistic Updates:** Experiencia de usuario (UX) a 0ms de latencia visual usando \onMutate\ en TanStack Query.

## Instalación y Desarrollo Local

Consulta el archivo [CONTRIBUTING.md](CONTRIBUTING.md) para ver la guía completa de instalación usando Docker Compose o ejecución nativa.

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.
