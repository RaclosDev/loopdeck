# LoopDeck (formerly FlashForge)

**A modern, spaced-repetition flashcard application designed to optimize long-term memory, built on the Ascension Tracker Platform.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Overview

LoopDeck is a powerful study tool inspired by Anki. It uses the proven SM-2 (Spaced Repetition) algorithm to schedule flashcards, ensuring you review information exactly when you are about to forget it. It has been fully migrated to the **Ascension Tracker Platform Architecture**, sharing the same UI kit, backend standards, and Docker deployment workflows.

## Features

- **Advanced Algorithm** — Uses the SM-2 Spaced Repetition Model for optimal review intervals
- **Deck & Card Management** — Full CRUD capabilities for decks and cards
- **Multiple Note Types** — Supports Basic, Basic (and reversed card), and Cloze deletion types
- **Immersive Study Session** — 3D card flips and full keyboard shortcut support (`Space` to flip, `1-4` for rating)
- **Insights & Stats** — Track your learning progress, retention rates, and daily study streaks
- **Ascension Standard Auth** — Secure OAuth2 Resource Server implementation, Refresh Tokens, and Google Login
- **PWA Ready** — Installable on mobile for an app-like studying experience

## Tech Stack

**Frontend (Ascension Stack)**
- React 19 + Vite
- Tailwind CSS
- Radix UI (Dialogs, UI Primitives)
- Zustand (State Management)
- React Router v6

**Backend (Ascension Stack)**
- Java 21
- Spring Boot 3.3.2
- Spring Security (OAuth2 Resource Server)
- PostgreSQL 16
- Flyway Migrations
- Google API Client (for Google Auth)

## Running the Application

### Prerequisites
- Docker & Docker Compose

### Start the Application (Production)

1. Rename `.env.example` to `.env` and fill in your secrets.
2. Run the application:
```bash
docker-compose up -d --build
```

The frontend will be available at `http://localhost:3000` and the backend at `http://localhost:8080`.

### Local Development

**Backend:**
```bash
cd backend
./mvnw spring-boot:run
```

**Frontend:**
```bash
cd frontend
npm ci
npm run dev
```

## Architecture Notes

LoopDeck is an independent application but strictly adheres to the design standards of **Ascension Tracker**.
- The backend uses standard explicit getters and setters instead of Lombok for compatibility.
- The authentication payload (`sub`) strictly maintains the `userId` to be compatible with existing Anki-style repositories and routes.
