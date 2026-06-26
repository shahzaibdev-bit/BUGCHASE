# BugChase Asset Discovery (FastAPI + Celery)

Runs on **port 9000** by default. The main app exposes `POST /initiate-scan`.  
The BugChase **Node API** proxies company requests to this service via `ASSET_DISCOVERY_URL` (see server `.env`).

## Redis (Upstash)

This service is **standalone** — configure Redis only in **`Asset-Discovery/.env`** (not `server/.env`).

1. Copy `.env.example` to `.env` on each deployment.
2. In [Upstash](https://upstash.com) → your database → **Connect** → copy the **`rediss://...`** URL (TLS).
3. Set `REDIS_URL=...` in `Asset-Discovery/.env`.

Do **not** use local `redis://127.0.0.1:6379`.

### Redis keys (what you see in Upstash)

| Key pattern | TTL? | Purpose |
|-------------|------|---------|
| `celery-task-meta-*` | Yes (~1h, `CELERY_RESULT_TTL_SEC`) | Temporary scan results for Celery |
| `_kombu.binding.*` | **No** (correct) | Celery queue routing; must persist while workers run |
| `lock:scan:{domain}` | Yes (15 min) | Prevents duplicate scans on same domain |

Do **not** delete `_kombu.binding.*` or add TTL to them — that breaks the task queue.

## WSL: install tools (example)

```bash
sudo apt update
sudo apt install -y subfinder nmap httpx-toolkit
pip install -r requirements.txt
```

Local Redis (optional): `sudo apt install redis-server` — only if you are **not** using Upstash.

## Run (two terminals in WSL)

**Terminal 1 — Celery worker**

You must run Celery from the `Asset-Discovery` folder (or use the helper script below).  
Running `celery -A task` from the **repo root** fails with `The module task was not found`.

```bash
cd Asset-Discovery
# Ensure Asset-Discovery/.env has REDIS_URL=rediss://...
C_FORCE_ROOT=1 celery -A task worker --loglevel=info -c 4
```

From the **repo root** (WSL/Linux):

```bash
./Asset-Discovery/start-worker.sh
```

On **Windows**, use a solo pool (prefork is not supported):

```powershell
cd Asset-Discovery
celery -A task worker --loglevel=info --pool=solo
```

Or from repo root:

```powershell
.\Asset-Discovery\start-worker.ps1
```

**Terminal 2 — API**

```bash
cd Asset-Discovery
# Ensure Asset-Discovery/.env has REDIS_URL=rediss://...
python main.py
```

## Node API

In `server/.env`:

```env
ASSET_DISCOVERY_URL=http://127.0.0.1:9000
```

If the API runs on Windows and Python on WSL, use the WSL IP or `host.docker.internal` as appropriate instead of `127.0.0.1`.

## Company UI

`/company/assets` calls `POST /api/company/assets/discovery-scan`, which forwards to `ASSET_DISCOVERY_URL/initiate-scan`.
