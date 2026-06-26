"""
Shared Redis connection for Asset Discovery (Upstash only).

Use the Redis protocol URL from the Upstash dashboard — not the REST API URL.
Celery broker/backend uses the same REDIS_URL.
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Any, Optional

from redis_url import get_redis_url_from_env, uses_tls, ssl_cert_kwargs

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
    kwargs = {"decode_responses": True}
    if uses_tls(url):
        kwargs.update(ssl_cert_kwargs())
    _redis_instance = redis.from_url(url, **kwargs)

    return _redis_instance
