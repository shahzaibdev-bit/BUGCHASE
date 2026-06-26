#!/usr/bin/env bash
# Run from anywhere — always uses Asset-Discovery as the Celery app directory.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

export C_FORCE_ROOT="${C_FORCE_ROOT:-1}"

python3 -c "from redis_url import get_redis_url_from_env; from urllib.parse import urlparse; print('[start-worker] Using Redis host:', urlparse(get_redis_url_from_env()).hostname or 'unknown')" 2>/dev/null \
  || python -c "from redis_url import get_redis_url_from_env; from urllib.parse import urlparse; print('[start-worker] Using Redis host:', urlparse(get_redis_url_from_env()).hostname or 'unknown')"

exec celery -A task worker --loglevel=info -c 4 "$@"
