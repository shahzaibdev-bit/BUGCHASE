"""
Normalize Redis URLs for Upstash and Celery.

Upstash closes plain redis:// connections — you must use TLS (rediss://).
The dashboard sometimes shows redis://; we upgrade to rediss:// when the host is upstash.io.
"""
from __future__ import annotations

import os
import ssl
from urllib.parse import urlparse, urlunparse

from dotenv import load_dotenv

load_dotenv()


def normalize_redis_url(raw: str | None) -> str:
    u = (raw or "").strip()
    if not u:
        raise RuntimeError(
            "REDIS_URL is required. Set your Upstash Redis URL in .env "
            "(e.g. rediss://default:PASSWORD@YOUR-ENDPOINT.upstash.io:6379). "
            "Use the Redis protocol URL from the Upstash dashboard, not the REST API URL."
        )

    lower = u.lower()
    if "upstash.io" in lower and u.startswith("redis://"):
        u = "rediss://" + u[len("redis://") :]

    parsed = urlparse(u)
    path = parsed.path or ""
    if path in ("", "/", "//"):
        path = "/0"
    return urlunparse((parsed.scheme, parsed.netloc, path, "", "", ""))


def get_redis_url_from_env() -> str:
    return normalize_redis_url(os.environ.get("REDIS_URL") or os.environ.get("UPSTASH_REDIS_URL"))


def uses_tls(url: str) -> bool:
    return url.startswith("rediss://")


def ssl_cert_kwargs():
    """For redis-py / Celery when using rediss://"""
    return {"ssl_cert_reqs": ssl.CERT_NONE}
