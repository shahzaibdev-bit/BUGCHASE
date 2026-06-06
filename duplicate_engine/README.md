# Bug Chase – Duplicate Detection Engine (FastAPI + Ollama)

A small, hardened FastAPI service that the BugChase Node.js backend calls when it needs deep LLM reasoning to decide if a newly submitted bug report duplicates an earlier one.

Same pattern as `cvss_engine/` and `kyc_engine/`:

```text
Express  ──HTTP──►  duplicate_engine (FastAPI)  ──HTTP──►  Ollama / Foundation-Sec 8B
```

The service does the prompt engineering, the JSON validation and the security checks so the Express side stays clean.

## Quick start (local)

```bash
cd duplicate_engine
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

You must have [Ollama](https://ollama.com) running and the model pulled once:

```bash
ollama serve
ollama pull hf.co/fdtn-ai/Foundation-Sec-8B-Reasoning-Q4_K_M-GGUF:latest
```

Run the engine:

```bash
python main.py
# -> http://localhost:7870
```

Health check:

```bash
curl http://localhost:7870/health
```

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `OLLAMA_URL` | `http://localhost:11434/api/generate` | Ollama generate endpoint |
| `DUPLICATE_LLM_MODEL` | `hf.co/fdtn-ai/Foundation-Sec-8B-Reasoning-Q4_K_M-GGUF:latest` | Model tag |
| `DUPLICATE_LLM_TIMEOUT_SECONDS` | `300` | Per-request timeout to Ollama |
| `DUPLICATE_ENGINE_PORT` | `7870` | Port FastAPI binds to |
| `DUPLICATE_ENGINE_API_KEY` | *(empty = open)* | Shared secret. **Set this in production.** Express must send it as `X-API-Key`. |
| `DUPLICATE_ENGINE_RATE_LIMIT` | `60` | Requests per window per client IP |
| `DUPLICATE_ENGINE_RATE_WINDOW` | `60` | Window length in seconds |
| `ALLOWED_ORIGINS` | *(empty)* | Comma-separated origins allowed by CORS (the engine is server-to-server; browsers should never hit it) |
| `LOG_LEVEL` | `INFO` | Python logger level |
| `AUTO_START_OLLAMA` | `true` | Spawn `ollama serve` automatically on startup if Ollama isn't already running |
| `OLLAMA_BIN` | `ollama` | Path / name of the Ollama executable |
| `OLLAMA_BOOT_TIMEOUT_SECONDS` | `60` | How long to wait for Ollama to become reachable after spawning |
| `OLLAMA_AUTO_PULL` | `true` | Pull `DUPLICATE_LLM_MODEL` automatically if it isn't installed |

### Auto-managed Ollama

When `AUTO_START_OLLAMA=true` (the default), the engine:

1. Probes Ollama on startup.
2. If unreachable, spawns `ollama serve` as a child process.
3. Waits up to `OLLAMA_BOOT_TIMEOUT_SECONDS` for the API to come up.
4. Pulls the configured model if it isn't installed yet (`OLLAMA_AUTO_PULL=true`).
5. Terminates the spawned Ollama process when the engine shuts down.

If Ollama was already running before you started the engine (for example, the Ollama desktop app), the engine leaves it alone and won't try to stop it.

## Endpoints

### `GET /health`

```json
{ "status": "ok", "model": "hf.co/fdtn-ai/Foundation-Sec-8B-Reasoning-Q4_K_M-GGUF:latest" }
```

### `POST /analyze-duplicate`

Request:

```json
{
  "new_report": {
    "report_id": "684e...",
    "title": "Username enumeration via /User/IsUsernameUnique",
    "bug_category": "Information Disclosure",
    "vulnerable_endpoint": "/User/IsUsernameUnique?username=admin",
    "parameter": "username",
    "steps_to_reproduce": "Send GET ...",
    "impact": "Attacker can enumerate ...",
    "payload": ""
  },
  "candidates": [
    {
      "report_id": "672b...",
      "title": "...",
      "bug_category": "...",
      "vulnerable_endpoint": "...",
      "parameter": "...",
      "steps_to_reproduce": "...",
      "impact": "...",
      "payload": ""
    }
  ]
}
```

Response:

```json
{
  "is_duplicate": true,
  "confidence_score": 0.92,
  "primary_duplicate_id": "672b...",
  "reasoning": "Both reports hit the same username-availability endpoint ...",
  "researcher_communication": "Hi researcher, your report appears to duplicate ...",
  "model_used": "hf.co/fdtn-ai/Foundation-Sec-8B-Reasoning-Q4_K_M-GGUF:latest"
}
```

Headers:

```text
X-API-Key: <DUPLICATE_ENGINE_API_KEY>
Content-Type: application/json
```

## Security model

| Risk | Mitigation |
| --- | --- |
| Unauthorized calls | `X-API-Key` (constant-time compare) |
| DoS via huge payloads | Pydantic length caps on every field, max 5 candidates, total prompt cap of 60k chars |
| HTML / script injection in stored reports | All text fields are HTML-stripped before going into the prompt |
| Control / zero-width chars | Stripped |
| Prompt injection (researcher tries to override the system prompt) | Common jailbreak markers redacted; system prompt explicitly tags user content as untrusted |
| LLM hallucinates an unknown report id | Output validation enforces `primary_duplicate_id ∈ candidates` |
| LLM returns malformed JSON | Three-pass JSON extractor + Pydantic response model; 502 if still invalid |
| LLM timeout / outage | Express side fails safe and falls back to raw Elastic matches |
| Burst traffic / single-IP abuse | In-process token-bucket rate limit per IP |
| Stack traces leaking to caller | Global exception handler returns a generic 500 |
| Browser direct access | CORS locked down; only server-to-server callers should hit it |

## Integration with Express

In `server/.env`:

```env
DUPLICATE_ENGINE_URL=http://127.0.0.1:7870/analyze-duplicate
DUPLICATE_ENGINE_API_KEY=<same value as the service>
DUPLICATE_LLM_ENABLED=true
```

`server/src/services/duplicateLlmService.ts` now sends a structured JSON payload to this engine instead of building Ollama prompts itself.

## Hugging Face Space deployment

This service is shaped exactly like a HF Space:

- `requirements.txt` for Python deps
- `Dockerfile` exposes port `7860` (HF default)
- Reads all config from environment variables
- No persistent state

Steps:

1. Create a new HF Space (type: Docker).
2. Push this folder.
3. Set Space secrets:
   - `DUPLICATE_ENGINE_API_KEY`
   - `OLLAMA_URL` (point to whatever serves Ollama inside the Space)
   - `DUPLICATE_LLM_MODEL`
4. In `server/.env` set `DUPLICATE_ENGINE_URL=https://<user>-bugchase-duplicate-engine.hf.space/analyze-duplicate`.
