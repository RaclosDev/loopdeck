# ⚡ LoopDeck

App de **repetición espaciada** (estilo Anki) construida con:

- **Frontend**: Vite + React 19, Zustand, React Router, PWA — glassmorphism dark design
- **Backend**: Spring Boot 3.3, Spring Security + JWT, JPA/Hibernate, Flyway
- **BD**: H2 (dev) / PostgreSQL (prod)
- **Algoritmo**: SM-2 (Spaced Repetition Model 2)

## 🚀 Arrancar en local

### Backend (puerto 8080)
```bash
cd backend
mvn spring-boot:run
```

### Frontend (puerto 5173)
```bash
npm install
npm run dev
```

La app estará en **http://localhost:5173** con proxy hacia el backend.

## ✨ Features

- 🔐 Auth con JWT (registro / login)
- 📚 CRUD de mazos y tarjetas
- 🧠 Tipos de nota: Básica, Básica+Reversa, Cloze
- 🔄 Sesión de estudio con flip 3D y atajos de teclado (Space, 1-4, Ctrl+Z)
- 📊 Estadísticas de colección
- 📱 PWA instalable en móvil
- 🌙 Glassmorphism dark theme

## 🗂️ Estructura

```
loopdeck/
├── src/                  # Frontend React
│   ├── components/       # Layout, FlashCard, Modal...
│   ├── pages/            # Dashboard, Study, AddCard, Stats, AuthPage
│   ├── services/api.js   # Cliente HTTP
│   └── store/            # Zustand stores
└── backend/              # Spring Boot
    └── src/main/java/com/loopdeck/
        ├── controller/   # REST endpoints
        ├── service/      # Lógica de negocio + SM-2
        ├── model/        # Entidades JPA
        ├── repository/   # Spring Data repos
        └── security/     # JWT + Spring Security
```
