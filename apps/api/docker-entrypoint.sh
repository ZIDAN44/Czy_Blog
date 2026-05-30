#!/bin/sh
set -e

# Apply any pending database migrations before the app boots.
# Safe to run on every start as `migrate deploy` is a no-op when up to date.
if [ -n "$DATABASE_URL" ]; then
  echo "[entrypoint] Applying database migrations..."
  npx --no-install prisma migrate deploy
else
  echo "[entrypoint] DATABASE_URL is not set — skipping migrations." >&2
fi

echo "[entrypoint] Starting: $*"
exec "$@"
