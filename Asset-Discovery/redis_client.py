"""
Shared Redis connection for Asset Discovery.

Supports:
- Local: redis://localhost:6379/0
- Upstash / TLS: rediss://default:PASSWORD@HOST:6379 (from Upstash "Redis" connect string)

Use the Redis protocol URL from the Upstash dashboard — not the REST API URL.
Celery also requires this same REDIS_URL for broker/backend.
"""
from __future__ import annotations

import os
from typing import TYPE_CHECKING, Any, Optional

from dotenv import load_dotenv

from redis_url import get_redis_url_from_env, uses_tls, ssl_cert_kwargs

load_dotenv()

if TYPE_CHECKING:
    import redis as redis_module

_redis_instance: Optional[Any] = None


def get_redis():
    """Singleton Redis client for API lock keys."""
    global _redis_instance
    if _redis_instance is not None:
        return _redis_instance

    import redis

    url = get_redis_url_from_env()

    if url and url != "redis://localhost:6379/0":
        kwargs = {"decode_responses": True}
        if uses_tls(url):
            kwargs.update(ssl_cert_kwargs())
        _redis_instance = redis.from_url(url, **kwargs)
    else:
        _redis_instance = redis.Redis(
            host=os.environ.get("REDIS_HOST", "localhost"),
            port=int(os.environ.get("REDIS_PORT", "6379")),
            db=int(os.environ.get("REDIS_DB", "0")),
            decode_responses=True,
        )

    return _redis_instance
