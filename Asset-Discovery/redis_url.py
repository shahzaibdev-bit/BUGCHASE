"""
Normalize Redis URLs for Upstash and Celery.

Upstash closes plain redis:// connections — you must use TLS (rediss://).
The dashboard sometimes shows redis://; we upgrade to rediss:// when the host is upstash.io.
"""
from __future__ import annotations

import os
import ssl
from pathlib import Path
from urllib.parse import urlparse, urlunparse

from dotenv import load_dotenv

_ASSET_DISCOVERY_DIR = Path(__file__).resolve().parent
_LOCAL_ENV = _ASSET_DISCOVERY_DIR / ".env"


def load_project_env() -> None:
    """Load configuration from Asset-Discovery/.env only (standalone microservice)."""
    if _LOCAL_ENV.is_file():
        load_dotenv(_LOCAL_ENV, override=True)


def normalize_redis_url(raw: str | None) -> str:
    u = (raw or "").strip()
    if not u:
        raise RuntimeError(
            "REDIS_URL is required. Set it in Asset-Discovery/.env "
            "(e.g. rediss://default:PASSWORD@YOUR-ENDPOINT.upstash.io:6379). "
            "Use the Redis protocol URL from the Upstash dashboard, not the REST API URL."
        )

    lower = u.lower()
    if "127.0.0.1" in lower or "localhost" in lower:
        raise RuntimeError(
            "Local Redis is not supported for Asset Discovery. "
            "Set REDIS_URL in Asset-Discovery/.env to your Upstash rediss:// URL."
        )

    if "upstash.io" in lower and u.startswith("redis://"):
        u = "rediss://" + u[len("redis://") :]

    parsed = urlparse(u)
    path = parsed.path or ""
    if path in ("", "/", "//"):
        path = "/0"
    return urlunparse((parsed.scheme, parsed.netloc, path, "", "", ""))


def get_redis_url_from_env() -> str:
    load_project_env()
    return normalize_redis_url(
        os.environ.get("REDIS_URL") or os.environ.get("UPSTASH_REDIS_URL")
    )


def uses_tls(url: str) -> bool:
    return url.startswith("rediss://")


def ssl_cert_kwargs():
    """For redis-py / Celery when using rediss://"""
    return {"ssl_cert_reqs": ssl.CERT_NONE}
