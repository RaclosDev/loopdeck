# Contributing to Loopdeck

¡Gracias por tu interés en contribuir a Loopdeck!

## Cómo levantar el proyecto

### Requisitos previos
- Docker y Docker Compose
- Node.js (v22 o superior)
- Java 17

### Paso a paso
1. Clona el repositorio: git clone https://github.com/RaclosDev/loopdeck.git
2. Copia .env.example a .env y rellena las variables de entorno. Necesitarás una API Key de Gemini.
3. Puedes usar docker-compose up -d postgres para levantar la base de datos de desarrollo.
4. Para el frontend, ve a rontend, ejecuta 
pm install y luego 
pm run dev. El backend se puede ejecutar con ./mvnw spring-boot:run (se conectará a la base de datos Dockerizada).

## Reglas Básicas
- **Commits:** Sigue la convención de [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) (feat:, fix:, chore:, refactor:, etc.).
- **Tests:** El proyecto usa Testcontainers para backend y Vitest/Playwright para frontend. Asegúrate de pasar la suite con ./mvnw verify y 
pm run test.
- **Formato:** El proyecto de frontend usa eslint y prettier. Al hacer commit, el hook pre-commit de Husky aplicará el formateo automáticamente.
- **Idioma:** Por coherencia, los mensajes de la UI y los endpoints deben mantenerse en español.
