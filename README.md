# BugChase

BugChase is a full-stack **bug bounty / coordinated vulnerability disclosure** platform. It connects **researchers**, **program owners (companies)**, **triagers**, and **admins** in one workflow: scoped programs, submissions, triage, payouts, and platform governance.

---

## Table of contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Optional services](#optional-services)
- [Production & deployment](#production--deployment)
- [Security](#security)
- [Scripts](#scripts)

---

## Overview

| Area | Capabilities |
|------|----------------|
| **Researchers** | Browse programs, submit reports (wizard + attachments), wallet, leaderboard, profile, verification |
| **Companies** | Programs, assets, reports, analytics, escrow, Stripe-funded flows, team settings |
| **Triagers** | Queues, assignments, expertise, report review |
| **Admins** | Users, programs, finance, disputes, logs, announcements, triager onboarding |
| **Public** | Marketing pages, legal/solutions content, certificate verification, public profiles |

Real-time updates use **Socket.IO** where enabled. Duplicate report hints can use a dedicated **AI embedding service** backed by **Qdrant**. A separate **KYC** service can be run for identity checks (proxied in local dev).

---

## Architecture

```text
┌─────────────────┐     HTTP / WS      ┌─────────────────┐
│  React (Vite)   │ ◄───────────────► │  Express API    │
│  client/        │    /api, socket   │  server/        │
└────────┬────────┘                   └────────┬────────┘
         │                                     │
         │ /kyc (dev proxy)                    │ MongoDB, Redis, email, Stripe
         ▼                                     ▼
┌─────────────────┐                   ┌─────────────────┐
│  kyc_engine/    │                   │  ai-service/    │◄── Qdrant (optional)
│  (FastAPI)      │                   │  (FastAPI)      │
└─────────────────┘                   └─────────────────┘
```

---

## Tech stack

| Layer | Technology |
|-------|------------|
| **Web app** | React 18, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS, shadcn/ui, Radix, TipTap, Stripe.js |
| **API** | Node.js, Express 5, TypeScript, Mongoose, JWT (access + refresh cookies), Zod, Helmet, rate limiting |
| **Data** | MongoDB, Redis (ioredis), Cloudinary (uploads) |
| **Real-time** | socket.io (server) / socket.io-client |
| **AI / search** | FastAPI, sentence-transformers, Qdrant client (duplicate similarity) |
| **KYC (optional)** | FastAPI, EasyOCR, DeepFace, OpenCV |

---

## Repository layout

| Path | Role |
|------|------|
| `client/` | Vite + React SPA (default dev server **port 3000**) |
| `server/` | REST API (default **port 5000**), WebSockets in non-Vercel dev |
| `ai-service/` | Embedding + duplicate search API (default **port 8001**) |
| `kyc_engine/` | Optional KYC API (dev proxy target **port 8000**) |
| `docker-compose.qdrant.yml` | Local **Qdrant** for vector storage |

---

## Prerequisites

- **Node.js** 18+ and npm (or compatible package manager)
- **MongoDB** connection string
- **Redis** URL (used by the API)
- Optional: **Docker** (for Qdrant), **Python 3.11+** (for `ai-service` and `kyc_engine`)

---

## Getting started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd bugbounty-hub-main
```

### 2. Server (`server/`)

```bash
cd server
npm install
```

Create **`server/.env`** (never commit this file). See [Environment variables](#environment-variables).

```bash
npm run dev          # development (ts-node-dev)
npm run build && npm start   # production-style run
```

### 3. Client (`client/`)

```bash
cd client
npm install
```

Create **`client/.env`** or use Vite defaults. For local development, `vite.config.ts` proxies `/api` → `http://localhost:5000` and `/socket.io` to the same host.

```bash
npm run dev          # http://localhost:3000
```

### 4. Optional: Qdrant + AI service

```bash
# From repository root
docker compose -f docker-compose.qdrant.yml up -d
```

```bash
cd ai-service
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate   # macOS / Linux
pip install -r requirements.txt
python main.py              # listens on PORT (default 8001)
```

Point the API at this service with `AI_SERVICE_URL` (see below).

### 5. Optional: KYC engine

```bash
cd kyc_engine
python -m venv .venv
pip install -r requirements.txt
# Run per your setup; Vite proxies /kyc → http://localhost:8000 in dev
```

---

## Environment variables

### Server (`server/.env`)

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection URL |
| `JWT_SECRET` | Access token signing secret |
| `JWT_EXPIRES_IN` | Access token lifetime |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime |
| `CLIENT_URL` | Public web app URL (CORS, cookies, email links) |
| `PORT` | HTTP port (default `5000`) |
| `NODE_ENV` | `development` / `production` |
| `EMAIL_USER` / `EMAIL_PASS` | SMTP (e.g. Gmail app password) |
| `STRIPE_SECRET_KEY` | Stripe server secret |
| `AI_SERVICE_URL` | Base URL for duplicate-detection service (default `http://localhost:8001`) |
| `DUPLICATE_SIMILARITY_THRESHOLD` | Optional float (default in code if unset) |
| `DUPLICATE_AUTOSCAN_COOLDOWN_MS` | Optional triager autoscan cooldown |
| `VERCEL` | Set by Vercel when applicable (changes listen / DB log behavior) |

> **Note:** Some integrations (e.g. media uploads, Google Generative AI) may be configured in code today. Prefer moving secrets into `.env` and rotating any key that was ever committed.

### Client (`client/.env`)

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | API base (e.g. `http://localhost:5000/api` or production `/api`) |
| `VITE_STRIPE_PUBLIC_KEY` | Stripe publishable key (wallet / escrow UI) |
| `VITE_KYC_API_URL` | KYC service base URL (defaults to `/kyc` in dev) |

---

## Optional services

| Service | Config / notes |
|---------|----------------|
| **Qdrant** | `docker compose -f docker-compose.qdrant.yml up -d` — REST **6333**, gRPC **6334** |
| **ai-service** | Env: `QDRANT_URL`, `QDRANT_COLLECTION`, `EMBED_MODEL`, `PORT`, etc. (see `ai-service/main.py`) |
| **Seeding** | `server/src/scripts/seedUsers.ts` — run manually with `ts-node` / `npx tsx` after configuring DB env vars used by that script |

---

## Production & deployment

- The server is written to support **Vercel** (`VERCEL`, `export default app`) while still supporting a classic Node listen in development.
- Allowed CORS origins include localhost and a default production client host; set **`CLIENT_URL`** so your deployed frontend origin is allowed and cookies/links are correct.
- Build the client with `npm run build` in `client/` and serve static assets from your host (e.g. Vercel, Netlify, nginx).
- Build the server with `npm run build` in `server/` and run `node dist/server.js` (or your process manager).

---

## Security

- **Do not commit** `server/.env`, `client/.env`, or `client/.env.production`. They are listed in `.gitignore`.
- If secrets were ever pushed, **rotate them** at the provider (MongoDB, Redis, JWT, Stripe, email, API keys) and consider **history rewriting** (`git filter-repo` / BFG) plus force-push if the repository is public.
- Use strong `JWT_SECRET` / `JWT_REFRESH_SECRET` in production; never rely on code defaults.

---

## Scripts

### Client

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production bundle |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

### Server

| Command | Description |
|---------|-------------|
| `npm run dev` | Watch mode with `ts-node-dev` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run `dist/server.js` |
| `npm run lint` | ESLint on `src/**/*.ts` |

---

## License

Component packages are subject to their respective **npm** / **PyPI** licenses (see `package.json` / `requirements.txt`). Add a root `LICENSE` file if you want a single explicit license for your own contributions.

---

**BugChase** — scoped disclosure, structured triage, and researcher-friendly workflows in one codebase.
