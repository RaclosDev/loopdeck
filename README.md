# FlashForge (LoopDeck)

**A modern, spaced-repetition flashcard application designed to optimize long-term memory.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Overview

FlashForge (internally known as LoopDeck) is a powerful study tool inspired by Anki. It uses the proven SM-2 (Spaced Repetition) algorithm to schedule flashcards, ensuring you review information exactly when you are about to forget it. Built with a stunning dark-mode glassmorphism UI.

## Features

- **Advanced Algorithm** — Uses the SM-2 Spaced Repetition Model for optimal review intervals
- **Deck & Card Management** — Full CRUD capabilities for decks and cards
- **Multiple Note Types** — Supports Basic, Basic (and reversed card), and Cloze deletion types
- **Immersive Study Session** — 3D card flips and full keyboard shortcut support (`Space` to flip, `1-4` for rating)
- **Insights & Stats** — Track your learning progress, retention rates, and daily study streaks
- **Cloud Sync** — Secure JWT-based authentication allows you to securely save and access your decks
- **PWA Ready** — Installable on mobile for an app-like studying experience

## Tech Stack

**Frontend**
- React 19 + Vite
- Zustand
- React Router v6
- Custom CSS (Dark Theme, Glassmorphism)

**Backend**
- Java 17 + Spring Boot 3.3
- Spring Security + JWT
- PostgreSQL (Production) / H2 (Development)
- Hibernate / JPA
- Flyway

## Getting Started

### Prerequisites
- Node.js 18+ and Java 17 for local development

### Quick Start

**1. Backend**
The backend uses an in-memory H2 database for local development.
```bash
git clone https://github.com/RaclosDev/loopdeck.git
cd loopdeck/backend
./mvnw spring-boot:run
```

**2. Frontend**
```bash
cd ../frontend
npm install
npm run dev
```

- Frontend → [http://localhost:5173](http://localhost:5173)
- Backend → [http://localhost:8080/api](http://localhost:8080/api)

## Project Structure

```text
loopdeck/
├── frontend/             # React + Vite application
├── backend/              # Spring Boot API
└── README.md
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

Developed by [RaclosDev](https://github.com/RaclosDev)
