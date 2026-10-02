# BedLink — TechForge Hackathon Healthtech Application

BedLink connects ambulances, paramedics, and nurses with nearby hospitals during critical emergencies. It provides real-time emergency broadcasts, explainable matching scores, 2-minute authoritative bed hold locks, and automated fallback coordination.

---

## 🏗 Architecture Overview

```
                      +-----------------------------+
                      |      Frontend Client        |
                      |   (TanStack Start / React)  |
                      +-----------------------------+
                           |                     ▲
                 REST API  |                     | Socket.IO
                 (HTTP)    |                     | (WebSockets)
                           ▼                     |
                      +-----------------------------+
                      |   BedLink Express Backend   |
                      |   (Node.js + TypeScript)    |
                      +-----------------------------+
                           |                     ▲
                 Prisma    |                     | SQL
                 ORM       |                     | Queries
                           ▼                     |
                      +-----------------------------+
                      |     PostgreSQL Database     |
                      |          (bedlink)          |
                      +-----------------------------+
```

---

## ⚡ The Emergency Workflow

```
AMBULANCE / PARAMEDIC
         │
         ▼
Create Emergency Request (GPS + Required Resources: ICU, Vent, Cardiac)
         │
         ▼
Backend computes Haversine distances & identifies eligible hospitals
         │
         ▼
BROADCAST via Socket.IO (NEW_EMERGENCY) to eligible hospital rooms
         │
         ▼
Hospitals submit capacity confirmations (POST /api/emergency-requests/:id/responses)
         │
         ▼
Backend Matching Engine ranks hospitals:
  • Resource Match (35%)
  • ETA / Travel Time (25%)
  • Data Freshness (15%)
  • Hospital Load (15%)
  • Distance (10%)
         │
         ▼
Ambulance receives ranked candidates (MATCHING_COMPLETED)
         │
         ▼
Ambulance selects hospital for bed hold (POST /api/reservations)
         │
         ▼
Hospital receives 2-minute hold countdown (RESERVATION_REQUEST)
         │
    ┌────┴─────────────────────────────┐
    ▼                                  ▼
[ACCEPT]                         [DECLINE or 2m TIMEOUT]
    │                                  │
Atomic transaction decrements          Automatic Fallback:
bed capacity and marks HELD.           Next ranked hospital automatically
Ambulance receives confirmation        receives hold request
(RESERVATION_ACCEPTED).                (FALLBACK_TRIGGERED).
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v20 or higher (`node -v`)
- **PostgreSQL**: v14 or higher running locally on port 5432
- **npm** or **yarn**

### 2. Backend Setup
```bash
cd backend

# Copy environment variables
cp .env.example .env

# Install backend dependencies
npm install

# Push database schema & generate Prisma client
npx prisma generate
npx prisma db push

# Seed demo hospitals, ambulances, and users
npm run prisma:seed

# Run automated tests (8 test suites, 23 tests)
npm test

# Start Express server on port 5000
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend

# Install frontend dependencies
npm install --legacy-peer-deps

# Start Vite dev server on port 5173 / 3000
npm run dev
```

---

## 👥 Demo User Credentials

All accounts use password: `demo123`

| Username | Password | Role | Description |
|---|---|---|---|
| `dispatcher1` | `demo123` | `dispatcher` | Paramedic / Ambulance A12 Dispatcher (Dadar TT Circle) |
| `nurse_city` | `demo123` | `hospital` | City Hospital Nurse (Parel) |
| `nurse_metro` | `demo123` | `hospital` | Metro Hospital Nurse (Mahim) |
| `admin` | `demo123` | `admin` | Command Center Network Administrator |

---

## ⏱ Test Mode vs Production Mode

To facilitate quick hackathon evaluations without waiting 120 seconds for timeout:
- **Test Mode**:
  ```env
  TEST_MODE=true
  RESERVATION_TIMEOUT_SECONDS=20
  ```
- **Production Mode**:
  ```env
  TEST_MODE=false
  RESERVATION_TIMEOUT_SECONDS=120
  ```

---

## 📚 Technical Documentation

Complete architectural specifications are available in `docs/`:
- [API Contract Specification](file:///c:/Users/Aryan/Hackathon%20Projects/BedLink-Backend-dev2/docs/API_CONTRACT.md)
- [Frontend to Backend Mapping](file:///c:/Users/Aryan/Hackathon%20Projects/BedLink-Backend-dev2/docs/FRONTEND_BACKEND_MAPPING.md)
- [WebSocket / Socket.IO Events](file:///c:/Users/Aryan/Hackathon%20Projects/BedLink-Backend-dev2/docs/WEBSOCKET_EVENTS.md)
- [Database Architecture & Schema](file:///c:/Users/Aryan/Hackathon%20Projects/BedLink-Backend-dev2/docs/DATABASE.md)
- [Integration Specification](file:///c:/Users/Aryan/Hackathon%20Projects/BedLink-Backend-dev2/docs/INTEGRATION.md)
