<div align="center">
  <img src="public/favicon.svg" alt="FlashForge Logo" width="120" />
  <h1>FlashForge (formerly LoopDeck) ⚡</h1>
  <p><strong>A modern, spaced-repetition flashcard application designed to optimize long-term memory.</strong></p>
  
  [![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
  [![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.3-brightgreen?logo=spring)](https://spring.io/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://postgresql.org/)
  [![Algorithm](https://img.shields.io/badge/Algorithm-SM--2-orange)]()
  
  <i>Study smarter, remember longer.</i>
</div>

---

## 📖 Overview

**FlashForge** (internally known as LoopDeck) is a powerful study tool inspired by Anki. It uses the proven **SM-2 (Spaced Repetition) algorithm** to schedule flashcards, ensuring you review information exactly when you are about to forget it. Built with a stunning dark-mode glassmorphism UI, it turns studying into a seamless and enjoyable experience.

## ✨ Key Features

- **🧠 Advanced Algorithm:** Uses the SM-2 Spaced Repetition Model for optimal review intervals.
- **📚 Deck & Card Management:** Full CRUD capabilities for decks and cards.
- **📝 Multiple Note Types:** Supports Basic, Basic (and reversed card), and Cloze deletion types.
- **🕹️ Immersive Study Session:** 3D card flips and full keyboard shortcut support (`Space` to flip, `1-4` for difficulty rating, `Ctrl+Z` to undo).
- **📊 Insights & Stats:** Track your learning progress, retention rates, and daily study streaks.
- **☁️ Secure Cloud Sync:** JWT-based authentication allows you to securely save and access your decks from anywhere.
- **📱 PWA Ready:** Install it on your mobile device for offline, app-like studying.

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19 + Vite
- **State Management:** Zustand
- **Routing:** React Router v6
- **Styling:** Custom CSS (Dark Theme, Glassmorphism)
- **Features:** PWA capabilities

### Backend
- **Framework:** Java 17 + Spring Boot 3.3
- **Security:** Spring Security + JWT
- **Database:** PostgreSQL (Production) / H2 (Development)
- **ORM:** Hibernate / JPA
- **Migrations:** Flyway

---

## 🚀 Getting Started

### Prerequisites
- Node.js & npm (Frontend)
- Java 17 & Maven (Backend)

### 1. Backend Setup

The backend runs on port `8080` by default. It uses an in-memory H2 database for local development.

```bash
cd backend
mvn spring-boot:run
```

### 2. Frontend Setup

The frontend runs on port `5173` and proxies API requests to the backend.

```bash
cd frontend
npm install
npm run dev
```

Navigate to `http://localhost:5173` in your browser.

---

## 📂 Project Structure

```
flashforge/
├── src/                    # Frontend UI (React)
│   ├── components/         # Layout, FlashCard, Modals
│   ├── pages/              # Dashboard, Study, AddCard, Stats, Auth
│   ├── services/api.js     # API Client (Axios)
│   └── store/              # Zustand state management
└── backend/                # API Server (Spring Boot)
    └── src/main/java/com/loopdeck/
        ├── controller/     # REST Endpoints
        ├── service/        # Business Logic & SM-2 algorithm
        ├── model/          # JPA Entities
        ├── repository/     # Spring Data JPA Repositories
        └── security/       # JWT Authentication configuration
```

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

<div align="center">
  <i>Developed with ❤️ by <a href="https://github.com/RaclosDev">RaclosDev</a></i>
</div>
