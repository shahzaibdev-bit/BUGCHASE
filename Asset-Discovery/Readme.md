# BugChase Asset Discovery (FastAPI + Celery)

Runs on **port 9000** by default. The main app exposes `POST /initiate-scan`.  
The BugChase **Node API** proxies company requests to this service via `ASSET_DISCOVERY_URL` (see server `.env`).

## Redis (Upstash or local)

This stack needs **Redis over the Redis protocol** (not the Upstash REST API only):

1. In [Upstash](https://upstash.com) → your database → **Connect** → copy the **`rediss://...`** URL (TLS).
2. Set the same URL in your environment for both the API and Celery:

```bash
export REDIS_URL="rediss://default:YOUR_PASSWORD@YOUR_ENDPOINT.upstash.io:6379"
```

Or create `Asset-Discovery/.env` from `.env.example` (`python-dotenv` loads it).

**Celery worker** must run with the same `REDIS_URL` so tasks are consumed.

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

```bash
cd Asset-Discovery
export REDIS_URL="rediss://..."   # or rely on .env
C_FORCE_ROOT=1 celery -A task worker --loglevel=info -c 4
```

On **Windows**, use a solo pool (prefork is not supported):

```powershell
cd Asset-Discovery
celery -A task worker --loglevel=info --pool=solo
```

**Terminal 2 — API**

```bash
cd Asset-Discovery
export REDIS_URL="rediss://..."   # or rely on .env
python main.py
# Listening on 0.0.0.0:9000
```

## Node API

In `server/.env`:

```env
ASSET_DISCOVERY_URL=http://127.0.0.1:9000
```

If the API runs on Windows and Python on WSL, use the WSL IP or `host.docker.internal` as appropriate instead of `127.0.0.1`.

## Company UI

`/company/assets` calls `POST /api/company/assets/discovery-scan`, which forwards to `ASSET_DISCOVERY_URL/initiate-scan`.
