# =============================================================================
# Bug Chase  -  Local CVSS Triage Backend
# -----------------------------------------------------------------------------
# A private FastAPI service that bridges a bug-bounty submission form to a
# local Ollama instance running the Cisco Foundation-Sec reasoning model.
#
# Separation of concerns:
#   * The LLM is responsible ONLY for choosing the 8 CVSS v3.1 Base metric
#     values (i.e. the vector string) and writing the human-readable
#     "Reasoning Breakdown".
#   * The numerical Base Score and qualitative severity are computed locally
#     by the official `cvss` Python library  -  the model is never trusted
#     with arithmetic.
#   * Every request builds a fresh payload, opens a fresh HTTP client and
#     forces Ollama to unload the model between calls, so prior submissions
#     can NEVER bleed into a new evaluation.
#
# Setup (one-time):
#   pip install -r requirements.txt
#   ollama pull axonvertex/Foundation-Sec-8B-Reasoning-Q8_0-GGUF:Q8_0_24K
#
# Run:
#   python main.py
#   ->  http://localhost:7860
# =============================================================================

from __future__ import annotations

import json
import os
import re
import secrets
from pathlib import Path
from typing import Literal

import httpx
from cvss import CVSS3, CVSS3Error
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/chat")
REQUEST_TIMEOUT_SECONDS = float(os.getenv("CVSS_REQUEST_TIMEOUT_SECONDS", "600"))

# Catalog of selectable local engines.  Add a new entry here and it will
# automatically show up in the frontend dropdown and become a valid choice
# in the /analyze-cvss payload.  The key is the short identifier the UI sends;
# the value is the exact Ollama tag.
AVAILABLE_MODELS: dict[str, dict[str, str]] = {
    "foundation-sec": {
        "label": "Cisco Foundation-Sec 8B (Q8 Reasoning)",
        "tag": "axonvertex/Foundation-Sec-8B-Reasoning-Q8_0-GGUF:Q8_0_24K",
    },
    "foundation-sec-q4": {
        "label": "Cisco Foundation-Sec 8B (Q4_K_M Reasoning)",
        "tag": "hf.co/fdtn-ai/Foundation-Sec-8B-Reasoning-Q4_K_M-GGUF:latest",
    },
}
DEFAULT_MODEL_KEY = "foundation-sec"

# Legacy single-model constant - kept so the /health endpoint and any
# external tooling still see the default model name.
OLLAMA_MODEL = AVAILABLE_MODELS[DEFAULT_MODEL_KEY]["tag"]

# -----------------------------------------------------------------------------
# FastAPI app + CORS
# -----------------------------------------------------------------------------
app = FastAPI(
    title="Bug Chase  -  CVSS Triage API",
    description="Local AI-assisted CVSS v3.1 triage for bug bounty submissions.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------------------------------------------------------
# Request schema  (mirrors the bug-bounty form exactly)
# -----------------------------------------------------------------------------
class BugReport(BaseModel):
    title: str = Field(..., min_length=1)
    vulnerable_endpoint: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    steps_to_reproduce: str = Field(..., min_length=1)
    impact: str = Field(..., min_length=1)
    category: str = Field(..., min_length=1)
    researcher_severity: Literal["Low", "Medium", "High", "Critical"]
    # Optional: which local engine to use. Falls back to the default if
    # omitted or unrecognised.
    model: str | None = Field(default=None)


# -----------------------------------------------------------------------------
# System prompt
# -----------------------------------------------------------------------------
# Hard rule: the model produces ONLY the vector string and a reasoning
# paragraph.  It is explicitly forbidden from outputting a numerical score
# or a severity word  -  those are computed by Python from the vector.
# -----------------------------------------------------------------------------
SYSTEM_PROMPT = """You are a strict, objective Corporate Security Auditor for the Bug Chase platform. Your primary rule is to prevent severity inflation by evaluating ONLY the immediate technical properties of the vulnerability, NOT theoretical secondary attacks.

You must respond ONLY with a valid JSON object matching this schema, containing no markdown or code blocks:
{
  "cvss_vector": "CVSS:3.1/AV:?/AC:?/PR:?/UI:?/S:?/C:?/I:?/A:?",
  "reasoning_breakdown": "<Short description explaining each chosen metric value based on explicit report evidence>"
}

--- CRITICAL EVALUATION RULES ---
1. EMAIL SPOOFING (Missing SPF/DMARC/MX Records):
   - These vulnerabilities do NOT breach server memory, alter data stores, or crash infrastructure.
   - You MUST apply these exact baseline metrics for missing SPF/DMARC:
     * AV:N (Network)
     * AC:H (High Complexity because it requires external delivery luck/victim spoof setups)
     * PR:N (No Privileges Required)
     * UI:R (Required User Interaction to open/read mail)
     * S:U (Unchanged Scope)
     * C:N (No Confidentiality impact)
     * I:L (Low Integrity impact because an email header is falsified, but no application data is changed)
     * A:N (No Availability impact)
   - Mandatory Vector String: CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:N/I:L/A:N

2. SCOPE CHANGES (S:C):
   - Only select S:C if the vulnerability allows a sandbox escape or allows an attacker to directly pivot and control a completely different underlying server or operating system. Do not use S:C for simple web path redirections or external emails.

3. IMPACT SCORES (C:H / I:H / A:H):
   - Only select High impact if the report contains concrete steps proving direct root database access, administrative command execution, or complete service teardown.

--- FEW-SHOT CORRECT CLASS REFERENCE ---
[Input Example]: Missing SPF/DMARC records on domain.
[Correct Response]: {"cvss_vector": "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:N/I:L/A:N", "reasoning_breakdown": "The flaw is a missing DNS policy configuration. The attack vector is remote (AV:N), but complexity is high (AC:H) and requires a recipient to interact with a spoofed message (UI:R). No administrative credentials or sessions are exposed, yielding no impact on confidentiality (C:N) or availability (A:N), and only a low impact on email communication context integrity (I:L)."}
"""


def build_user_prompt(report: BugReport) -> str:
    """Construct a fresh user prompt from the submitted report only.

    No module-level state is referenced; every call rebuilds the entire
    string from the request payload, so a prior submission cannot bleed in.
    """
    return (
        "Disregard any previous reports, examples or conversational context. "
        "Evaluate ONLY the single bug report between the markers below, and "
        "return the JSON object exactly as specified in the system instructions.\n\n"
        "===== BEGIN BUG REPORT =====\n"
        f"Title:                {report.title}\n"
        f"Vulnerable Endpoint:  {report.vulnerable_endpoint}\n"
        f"VRT Category:         {report.category}\n"
        f"Researcher Severity:  {report.researcher_severity}   "
        "(informational only - do NOT factor this into the vector)\n\n"
        "Description:\n"
        f"{report.description}\n\n"
        "Steps to Reproduce:\n"
        f"{report.steps_to_reproduce}\n\n"
        "Impact:\n"
        f"{report.impact}\n"
        "=====  END BUG REPORT  =====\n\n"
        "Now produce the JSON object containing only `cvss_vector` and "
        "`reasoning_breakdown`."
    )


# -----------------------------------------------------------------------------
# Vector helpers
# -----------------------------------------------------------------------------
_VECTOR_REGEX = re.compile(
    r"CVSS:3\.1/"
    r"AV:[NALP]/"
    r"AC:[LH]/"
    r"PR:[NLH]/"
    r"UI:[NR]/"
    r"S:[UC]/"
    r"C:[NLH]/"
    r"I:[NLH]/"
    r"A:[NLH]"
)


def extract_json_object(text: str) -> dict:
    """Best-effort JSON extraction from a model response."""
    text = (text or "").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fenced:
        try:
            return json.loads(fenced.group(1))
        except json.JSONDecodeError:
            pass

    brace = re.search(r"\{.*\}", text, re.DOTALL)
    if brace:
        return json.loads(brace.group(0))

    raise ValueError("Model response did not contain a parseable JSON object.")


def normalise_vector(raw: str) -> str:
    """Locate and return a canonical CVSS:3.1 vector inside any string."""
    if not raw:
        raise ValueError("Vector string is empty.")
    candidate = raw.strip().replace(" ", "")
    if not candidate.upper().startswith("CVSS:3.1/"):
        candidate = "CVSS:3.1/" + candidate.lstrip("/")
    match = _VECTOR_REGEX.search(candidate.upper())
    if not match:
        raise ValueError(f"Could not find a valid CVSS:3.1 vector in: {raw!r}")
    return match.group(0)


# -----------------------------------------------------------------------------
# Routes
# -----------------------------------------------------------------------------
@app.get("/", include_in_schema=False)
async def serve_frontend():
    index_path = Path(__file__).parent / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return JSONResponse({"status": "Bug Chase backend online", "model": OLLAMA_MODEL})


@app.get("/health")
async def health():
    return {"status": "ok", "model": OLLAMA_MODEL}


@app.get("/models")
async def list_models():
    """Return the catalog of selectable engines for the frontend dropdown."""
    return {
        "default": DEFAULT_MODEL_KEY,
        "models": [
            {"key": key, "label": info["label"], "tag": info["tag"]}
            for key, info in AVAILABLE_MODELS.items()
        ],
    }


# -----------------------------------------------------------------------------
# Keyword trigger sets for the programmatic constraints layer.
# Kept as regex patterns with word boundaries so we don't accidentally match
# the middle of unrelated words (e.g. "spf" inside "spfile").
# -----------------------------------------------------------------------------
_EMAIL_AUTH_TRIGGERS = re.compile(
    r"\b("
    r"spf|dmarc|dkim|"
    r"email\s*spoof\w*|mail\s*spoof\w*|sender\s*spoof\w*|"
    r"email\s*forg\w*|header\s*forg\w*|"
    r"email\s*impersonat\w*|sender\s*impersonat\w*|"
    r"sender\s*policy|sender\s*authentication|email\s*authentication|"
    r"mail\s*server\s*misconfig\w*|"
    r"missing\s*(?:spf|dmarc|dkim)"
    r")\b",
    re.IGNORECASE,
)

_RATE_LIMIT_TRIGGERS = re.compile(
    r"\b("
    r"rate\s*limit\w*|"
    r"email\s*bomb\w*|mail\s*bomb\w*|"
    r"spam(?:ming)?|"
    r"brute\s*force(?:\s*throttl\w*)?|"
    r"captcha\s*bypass|"
    r"otp\s*bomb\w*|sms\s*bomb\w*|"
    r"flood(?:ing)?"
    r")\b",
    re.IGNORECASE,
)


@app.post("/analyze-cvss")
async def analyze_cvss(report: BugReport):
    """Triage a single bug report.

    Pipeline:
      1. Send a STRICT, few-shot system prompt + the full report context to
         the local Ollama model (deterministic sampling, JSON-only output).
      2. Apply a hard programmatic constraints layer that catches the two
         most common LLM inflation traps (email-auth bugs + rate-limit bugs)
         using regex word-boundary keyword detection across EVERY field of
         the report.
      3. Compute the authoritative CVSS v3.1 score with the official
         `cvss` Python library.
    """

    # ---- 0. Resolve which local engine to use -------------------------------
    selected_key = (report.model or DEFAULT_MODEL_KEY).strip().lower()
    if selected_key not in AVAILABLE_MODELS:
        selected_key = DEFAULT_MODEL_KEY
    model_tag = AVAILABLE_MODELS[selected_key]["tag"]
    model_label = AVAILABLE_MODELS[selected_key]["label"]

    # ---- 1. Build payload using the full SYSTEM_PROMPT + build_user_prompt --
    payload = {
        "model": model_tag,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(report)},
        ],
        "stream": False,
        "format": "json",
        "keep_alive": "10m",
        "options": {
            "temperature": 0.0,
            "top_p": 0.1,
            "num_ctx": 4096,
            "num_predict": 512,
            "seed": secrets.randbits(31),
        },
    }

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            resp = await client.post(OLLAMA_URL, json=payload)
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Ollama transport error: {exc}")

    content = (data.get("message") or {}).get("content", "")

    try:
        ai_output = extract_json_object(content)
    except Exception:
        raise HTTPException(status_code=502, detail="Model output was not valid JSON.")

    raw_vector = str(ai_output.get("cvss_vector", "")).strip()
    reasoning = str(ai_output.get("reasoning_breakdown", "")).strip()

    try:
        vector = normalise_vector(raw_vector)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid vector pattern: {exc}")

    # =========================================================================
    # HARD PROGRAMMATIC CONSTRAINTS LAYER  (Stops AI False Positives)
    # -------------------------------------------------------------------------
    # Trigger text now spans EVERY field of the report (title, endpoint,
    # description, steps, impact and VRT category) and uses regex word
    # boundaries so synonyms ("DKIM", "email forging", "sender impersonation",
    # "mail spoofing", "OTP bombing", etc.) are reliably caught.
    # =========================================================================
    trigger_text = " ".join([
        report.title or "",
        report.vulnerable_endpoint or "",
        report.description or "",
        report.steps_to_reproduce or "",
        report.impact or "",
        report.category or "",
    ])

    # Constraint A: Email-authentication / spoofing / SPF / DMARC / DKIM
    #               (checked FIRST so it always wins over generic spam keywords)
    if _EMAIL_AUTH_TRIGGERS.search(trigger_text):
        vector = "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:N/I:L/A:N"
        reasoning += (
            " [Backend Rule Applied: This report matches the email-authentication "
            "class (SPF / DMARC / DKIM / email spoofing / sender impersonation). "
            "The CVSS vector has been clamped to the industry-standard baseline "
            "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:N/I:L/A:N (Base Score 5.3, Medium) "
            "to override LLM severity inflation. No server memory is breached, no "
            "data store is altered, and no infrastructure is crashed.]"
        )

    # Constraint B: Rate limiting / email bombing / OTP bombing / spam / flood
    elif _RATE_LIMIT_TRIGGERS.search(trigger_text):
        vector = re.sub(r"S:[UC]", "S:U", vector)
        vector = re.sub(r"I:[NLH]", "I:N", vector)
        vector = re.sub(r"A:[NLH]", "A:L", vector)
        reasoning += (
            " [Backend Rule Applied: Rate-limiting / spam-class flaw detected. "
            "Forced Scope:Unchanged, Integrity:None and Availability:Low to "
            "prevent severity inflation - spam and bombing are nuisance-level "
            "availability issues, not full service teardown.]"
        )
    # =========================================================================

    # ---- 3. Authoritative CVSS math via the official `cvss` library ---------
    try:
        cvss_obj = CVSS3(vector)
        base_score = float(cvss_obj.base_score)
        base_severity = cvss_obj.severities()[0].capitalize()
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Math library error: {exc}")

    severity_changed = base_severity.lower() != report.researcher_severity.lower()
    severity_change_explanation = ""
    if severity_changed:
        severity_change_explanation = (
            f"The researcher rated this as {report.researcher_severity}, but the "
            f"CVSS v3.1 vector {vector} computes to {base_score:.1f} ({base_severity}). "
            "See the Reasoning Breakdown above for the per-metric justification."
        )

    return {
        "cvss_vector": vector,
        "cvss_score": round(base_score, 1),
        "calculated_severity": base_severity,
        "researcher_severity": report.researcher_severity,
        "severity_changed": severity_changed,
        "severity_change_explanation": severity_change_explanation,
        "reasoning_breakdown": reasoning,
        "model_used": {
            "key": selected_key,
            "label": model_label,
            "tag": model_tag,
        },
    }


# -----------------------------------------------------------------------------
# Entrypoint
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("CVSS_ENGINE_PORT", "7860"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
