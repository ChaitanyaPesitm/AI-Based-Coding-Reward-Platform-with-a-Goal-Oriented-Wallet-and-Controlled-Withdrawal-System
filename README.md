# AI-Based Coding Reward Platform

A gamified coding practice platform where students earn **reward points** by solving coding problems. Code is executed on a real sandbox, evaluated by **AI** (Google Gemini), and points accumulate in a **goal-oriented wallet**. Once the user reaches their financial goal, they can request a withdrawal — which admins approve after a fraud check.

## Features

- 🧠 **Solve coding problems** in C, Python, and Java — executed live on a real sandbox (Wandbox).
- 🤖 **AI code evaluation** — Gemini scores code quality, efficiency, and time/space complexity (with automatic fallback when the API is unavailable).
- 💰 **Goal-oriented wallet** — set a savings goal (laptop, exam fee, etc.) and track progress toward it.
- 🏧 **Controlled withdrawals** — request payout only when your goal is met; admins review with a **fraud score**.
- 🏆 **Gamification** — leaderboards, badges, daily streaks, bonus points.
- 🛡️ **Proctoring mode** — monitors tab-switching, copy/paste, keyboard shortcuts, and idle time during problem solving. Admins can enable/disable it from the dashboard.
- 🎬 **Rewarded ads** — watch a short ad to unlock an AI hint (+5% bonus).
- ⚙️ **Admin dashboard** — manage problems, approve/reject withdrawals, and toggle platform settings.
- 🌗 **Dark / Light mode** — theme toggle persisted to `localStorage` (no flash on load).

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Frontend | Next.js 16 (Turbopack), React 19, Tailwind CSS 4, Monaco Editor |
| Backend  | Node.js, Express 4, Socket.io |
| Database | MongoDB (Mongoose 8) — Atlas or local/in-memory fallback |
| Auth     | JWT + bcrypt |
| Security | express-rate-limit (auth, API, submission limits) |
| CI/Deploy| Docker Compose, Vercel (client), Render (server) |

## Project Structure

```
.
├── client/                  # Next.js frontend
│   ├── app/                 # App Router pages (dashboard, problems, admin, wallet, ...)
│   ├── components/          # Navbar, ProctoringOverlay, GoalAd, ...
│   ├── lib/                 # api.js, AuthContext, ThemeContext
│   └── next.config.mjs      # standalone output, Turbopack config
├── server/                  # Express backend
│   ├── models/              # User, Problem, Submission, Wallet, Withdrawal, Setting, Goal
│   ├── routes/              # auth, problems, submissions, wallet, withdrawals, leaderboard, ads, settings
│   ├── services/            # wandbox (execution), gemini (AI), rewardEngine, socket
│   ├── middleware/          # auth (JWT), rateLimiter
│   ├── utils/autoSeed.js    # seeds admin + demo users + default problems
│   └── seed.js              # seeds 104 problems + 25 students
└── docker-compose.yml       # runs both services
```

## Getting Started

### Prerequisites

- Node.js 20+ (project developed on Node 24)
- npm

### 1. Backend (server) — port 5000

```bash
cd server
npm install
cp .env.example .env   # then edit .env with your values
npm run seed           # optional: seed 104 problems + 25 demo students
npm run dev            # or npm start
```

`.env` configuration:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string. If it can't be reached, the server automatically falls back to an in-memory database (auto-seeds default data). |
| `JWT_SECRET` | Any random string used to sign auth tokens. |
| `GEMINI_API_KEY` | Google Gemini API key (optional — AI evaluation falls back to test-pass scoring if missing). |
| `PORT` | Server port (default `5000`). |
| `CLIENT_URL` | Allowed frontend origin for CORS (default `http://localhost:3000`). |

> **Troubleshooting Atlas:** if `mongodb+srv://...` fails with `querySrv ECONNREFUSED` (some networks/DNS refuse SRV lookups), use a direct connection string with the cluster's shard hostnames and replica set, e.g. `mongodb://<user>:<pass>@<shard-00>.mongodb.net:27017,<shard-01>.mongodb.net:27017,<shard-02>.mongodb.net:27017/coding-reward-platform?ssl=true&retryWrites=true&w=majority&authSource=admin&replicaSet=atlas-xxxx-shard-0`.

### 2. Frontend (client) — port 3000

```bash
cd client
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional client env vars (defaults point at localhost):

| Variable | Default |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000/api` |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:5000` |

### Demo accounts

The server seeds these accounts automatically:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@coderward.com` | `Admin@Code2026!` |
| Demo Student | `student@example.com` | `Student@Code2026!` |
| Students (×25) | `aarav@coderward.com` … | `student123` |

## Docker

From the project root, with environment variables exported (or in a root `.env`):

```bash
export MONGODB_URI=...
export JWT_SECRET=...
export GEMINI_API_KEY=...
docker compose up --build
```

- Client: http://localhost:3000
- API: http://localhost:5000

## API Overview

Public/authenticated endpoints under `/api`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register`, `/auth/login` | Authentication |
| GET | `/problems`, `/problems/:id` | List / view problems |
| POST | `/submissions` | Submit code (execution + AI evaluation + points) |
| GET | `/wallet`, `/wallet/history` | Wallet overview & transactions |
| GET/POST | `/goals` | Savings goals |
| GET/POST | `/withdrawals` (admin) | Withdrawal requests & review |
| GET | `/leaderboard` | Top users, badges |
| GET/PUT | `/settings` | Platform settings (PUT is admin-only) |

## Running Tests

```bash
cd server
npm test        # 55 tests (auth, submissions, reward engine, ads, features)
```

## License

Educational / academic project.
