# BugChase

BugChase is a full-stack **bug bounty and coordinated vulnerability disclosure** platform. It connects **researchers**, **companies**, **triagers**, **support agents**, and **admins** in one workflow: scoped programs, report submission, triage, payouts, disputes, and platform governance.

This guide is written so you can **clone, configure, and run** the project locally without guesswork.

---

## Table of contents

- [What you need](#what-you-need)
- [Repository layout](#repository-layout)
- [Quick start (local development)](#quick-start-local-development)
- [Running the apps](#running-the-apps)
- [Environment variables](#environment-variables)
- [Hosted services (no local setup)](#hosted-services-no-local-setup)
- [Optional local services](#optional-local-services)
- [Minimal local setup tips](#minimal-local-setup-tips)
- [Production deployment](#production-deployment)
- [Security](#security)
- [Scripts reference](#scripts-reference)

---

## What you need

| Requirement | Notes |
|-------------|--------|
| **Node.js 18+** and **npm** | For `server/`, `client/`, and `support-client/` |
| **MongoDB** | Local or [MongoDB Atlas](https://www.mongodb.com/atlas) |
| **Redis** | [Upstash Redis](https://upstash.com) works well (use the `rediss://` URL) |
| **Git** | To clone the repository |

**You do not need Python** for a basic local run if you use the hosted KYC engine and disable optional AI engines (see [Minimal local setup tips](#minimal-local-setup-tips)).

---

## Repository layout

| Path | Role | Default port |
|------|------|--------------|
| `server/` | Express API, WebSockets, business logic | **5000** |
| `client/` | Main React web app (researchers, companies, triagers, admins) | **3000** |
| `support-client/` | Support / disputes portal | **3101** |
| `kyc_engine/` | KYC FastAPI source (deployed to Hugging Face — **do not run locally**) | — |
| `duplicate_engine/` | Optional duplicate-detection LLM service | 7870 |
| `cvss_engine/` | Optional CVSS triage LLM service | 7860 |
| `Asset-Discovery/` | Optional subdomain / asset scan worker (FastAPI + Celery) | 9000 |

VRT taxonomy data used by the report wizard lives at `client/src/data/vrt-categories.json` (bundled with the client).

---

## Quick start (local development)

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd bugbounty-hub-main
```

### 2. Install dependencies

Open three terminals (or run installs sequentially):

```bash
cd server && npm install
cd ../client && npm install
cd ../support-client && npm install
```

### 3. Configure environment files

Copy the example env files and fill in real values:

```bash
# Server (required)
cp server/.env.example server/.env

# Main web app (Stripe publishable key recommended for wallet flows)
cp client/.env.example client/.env

# Support portal (optional for local dev — Vite proxies /api to port 5000)
cp support-client/.env.example support-client/.env
```

**Minimum server `.env` fields to change:**

- `MONGO_URI` — your MongoDB connection string  
- `REDIS_URL` — Upstash `rediss://...` URL (not the REST URL)  
- `JWT_SECRET` and `JWT_REFRESH_SECRET` — long random strings  
- `CLIENT_URL=http://localhost:3000`  
- `SUPPORT_CLIENT_URL=http://localhost:3101`  

The example `server/.env` already points **`KYC_ENGINE_URL`** at the public Hugging Face Space — leave it as-is unless you host your own.

### 4. Start the stack

**Terminal 1 — API**

```bash
cd server
npm run dev
```

**Terminal 2 — Main web app**

```bash
cd client
npm run dev
```

Open **http://localhost:3000**

**Terminal 3 — Support portal (optional)**

```bash
cd support-client
npm run dev
```

Open **http://localhost:3101**

The Vite dev servers proxy `/api` to `http://localhost:5000`, so you usually **do not** need to set `VITE_API_URL` locally.

---

## Running the apps

```text
┌─────────────────────┐     /api, WebSocket      ┌─────────────────────┐
│  client/            │ ◄──────────────────────► │  server/            │
│  localhost:3000     │                          │  localhost:5000     │
└─────────────────────┘                          └──────────┬──────────┘
┌─────────────────────┐                                     │
│  support-client/    │ ◄─────────────────────────────────┘
│  localhost:3101     │
└─────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ MongoDB, Redis   │
                    └──────────────────┘
                              │
                              ▼ (server-to-server HTTP)
                    ┌──────────────────┐
                    │ KYC on HF Space  │  ← already hosted, no local Python
                    └──────────────────┘
```

---

## Environment variables

### Server (`server/.env`)

See **`server/.env.example`** for the full list with comments. Highlights:

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | MongoDB connection |
| `REDIS_URL` | Redis / Upstash (`rediss://...`) |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Auth tokens |
| `CLIENT_URL` | Main app origin (CORS, emails, cookies) |
| `SUPPORT_CLIENT_URL` | Support portal origin |
| `KYC_ENGINE_URL` | **Hugging Face Space URL** (default in `.env.example`) |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLIC_KEY` | Wallet top-ups |
| `GEMINI_API_KEY` | AI summaries, bounty suggestions (optional) |
| `DUPLICATE_ENGINE_URL` / `DUPLICATE_LLM_ENABLED` | Duplicate LLM (optional) |
| `CVSS_TRIAGE_URL` / `CVSS_TRIAGE_ENABLED` | CVSS triage (optional) |
| `ASSET_DISCOVERY_URL` | Asset scan service (optional) |

### Client (`client/.env`)

| Variable | Purpose |
|----------|---------|
| `VITE_STRIPE_PUBLIC_KEY` | Must match server `STRIPE_PUBLIC_KEY` |
| `VITE_API_URL` | Optional locally (Vite proxy handles `/api`) |

### Support client (`support-client/.env`)

| Variable | Purpose |
|----------|---------|
| `VITE_GOOGLE_CLIENT_ID` | Optional Google sign-in |
| `VITE_API_URL` | Optional locally (proxy to port 5000) |

---

## Hosted services (no local setup)

### KYC engine (Hugging Face Space)

Researcher identity verification is handled by a **hosted FastAPI service** on Hugging Face. You **do not** need to install Python, EasyOCR, or DeepFace locally, and you **do not** need to run `kyc_engine/` on your machine.

Default in `server/.env.example`:

```env
KYC_ENGINE_URL=https://chshahzaib123-bugchase-kyc-engine.hf.space
KYC_ENGINE_TIMEOUT_MS=120000
```

**Flow:**

1. Browser sends CNIC + selfie to `POST /api/users/kyc-verify`  
2. Express uploads images to Cloudinary  
3. Express calls the Hugging Face Space with image URLs only  
4. Verdict is stored on the user record  

The `kyc_engine/` folder in this repo is the **source code for that Space**, kept for deployment reference only.

> **Note:** Hugging Face Spaces can take 30–90 seconds to wake from idle on the free tier. The server retries once and uses a 2-minute timeout by default.

---

## Optional local services

Only run these if you need the feature in development:

| Service | When you need it | Docs |
|---------|------------------|------|
| **duplicate_engine** | LLM duplicate analysis on new reports | `duplicate_engine/README.md` |
| **cvss_engine** | AI-assisted CVSS scoring on submit | `cvss_engine/main.py` header |
| **Asset-Discovery** | Company asset / subdomain scans | `Asset-Discovery/Readme.md` |

Duplicate detection also uses **MongoDB Atlas Search** (index created automatically on server startup when using Atlas).

---

## Minimal local setup tips

To get the UI and core flows working **without** Ollama or extra Python services, set in `server/.env`:

```env
DUPLICATE_LLM_ENABLED=false
CVSS_TRIAGE_ENABLED=false
```

You can still browse programs, submit reports, triage manually, and use admin/company dashboards. Re-enable these flags when you run `duplicate_engine` and `cvss_engine` locally.

**Email:** Configure `EMAIL_USER` and `EMAIL_PASS` (e.g. Gmail app password) for verification and notification emails.

**Stripe:** Add test keys from the [Stripe dashboard](https://dashboard.stripe.com/test/apikeys) to `server/.env` and `client/.env` for wallet top-ups.

**Seeding test users (optional):**

```bash
cd server
npx tsx src/scripts/seedUsers.ts
```

---

## Production deployment

- **Server:** `npm run build && npm start` in `server/` (or deploy to Vercel — see `server/vercel.json`).  
- **Client:** `npm run build` in `client/` — static output in `client/dist/`.  
- **Support portal:** `npm run build` in `support-client/`.  
- Set **`CLIENT_URL`** and **`SUPPORT_CLIENT_URL`** to your production domains.  
- Keep **`KYC_ENGINE_URL`** pointed at the Hugging Face Space (or your own hosted URL).  
- Never commit `.env` files.

---

## Security

- **Do not commit** `server/.env`, `client/.env`, or production secrets.  
- Use strong `JWT_SECRET` / `JWT_REFRESH_SECRET` in production.  
- Rotate any key that was ever exposed in git history.  
- `DUPLICATE_ENGINE_API_KEY` should be set in production when the duplicate engine is exposed.

---

## Scripts reference

### Server (`server/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Development with hot reload |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run production build |
| `npm run lint` | ESLint |

### Client (`client/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server → http://localhost:3000 |
| `npm run build` | Production bundle |
| `npm run preview` | Preview production build |

### Support client (`support-client/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server → http://localhost:3101 |
| `npm run build` | Production bundle |

---

## Platform overview

| Role | Capabilities |
|------|----------------|
| **Researchers** | Programs, report wizard (VRT taxonomy), wallet, KYC, leaderboard |
| **Companies** | Programs, assets, reports, escrow, Stripe wallet, private programs |
| **Triagers** | Queues, assignments, report review, CVSS |
| **Support** | Dispute queue and ticket handling |
| **Admins** | Users, programs, finance, logs, announcements |

Real-time updates use **Socket.IO** where enabled.

---

**BugChase** — scoped disclosure, structured triage, and researcher-friendly workflows in one codebase.
