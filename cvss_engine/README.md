# Bug Chase – CVSS Triage Engine (FastAPI + Ollama)

Local AI-assisted CVSS v3.1 triage service. The Node.js backend POSTs every newly submitted bug report here right after spam screening and duplicate detection. This service asks a local Ollama LLM (Cisco Foundation-Sec) for only the CVSS vector + reasoning, applies hard programmatic constraints for known LLM inflation traps, then computes the authoritative score/severity via the `cvss` Python library.

## Quick start

```bash
cd cvss_engine
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

You also need [Ollama](https://ollama.com) running locally and at least one of the configured models pulled:

```bash
ollama pull axonvertex/Foundation-Sec-8B-Reasoning-Q8_0-GGUF:Q8_0_24K
# or the smaller quant
ollama pull hf.co/fdtn-ai/Foundation-Sec-8B-Reasoning-Q4_K_M-GGUF:latest
```

Run the service:

```bash
python main.py
# -> http://localhost:7860
```

Health check:

```bash
curl http://localhost:7860/health
```

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `OLLAMA_URL` | `http://localhost:11434/api/chat` | Ollama chat endpoint |
| `CVSS_ENGINE_PORT` | `7860` | Port FastAPI binds to |
| `CVSS_REQUEST_TIMEOUT_SECONDS` | `600` | Per-request timeout to Ollama |

## Endpoints

- `GET  /health` – sanity check
- `GET  /models` – list selectable engines
- `POST /analyze-cvss` – analyse a single bug report

`POST /analyze-cvss` request body:

```json
{
  "title": "...",
  "vulnerable_endpoint": "...",
  "description": "...",
  "steps_to_reproduce": "...",
  "impact": "...",
  "category": "...",
  "researcher_severity": "Medium",
  "model": "foundation-sec"
}
```

Response:

```json
{
  "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
  "cvss_score": 7.5,
  "calculated_severity": "High",
  "researcher_severity": "Medium",
  "severity_changed": true,
  "severity_change_explanation": "...",
  "reasoning_breakdown": "...",
  "model_used": { "key": "foundation-sec", "label": "...", "tag": "..." }
}
```

## Integration with the Node.js backend

The Express backend reads `CVSS_TRIAGE_URL` from its `.env` and POSTs to `<CVSS_TRIAGE_URL>/analyze-cvss` after spam guard + duplicate detection succeed. See `server/src/services/cvssTriageService.ts`.
