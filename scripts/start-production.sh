#!/usr/bin/env bash
# Soatbay — bitta jarayonda backend + ikkala bot (Render va boshqa PaaS uchun)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export NODE_ENV=production
export BACKEND_PORT="${PORT:-${BACKEND_PORT:-3000}}"

node "$ROOT/apps/backend/dist/main.js" &
BACKEND_PID=$!

node "$ROOT/apps/employer-bot/dist/main.js" &
EMPLOYER_PID=$!

node "$ROOT/apps/worker-bot/dist/main.js" &
WORKER_PID=$!

shutdown() {
  kill "$BACKEND_PID" "$EMPLOYER_PID" "$WORKER_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$EMPLOYER_PID" "$WORKER_PID" 2>/dev/null || true
}

trap shutdown SIGTERM SIGINT

# Biror bot yoki backend tushsa — butun servis qayta ishga tushadi (Render restart)
wait -n "$BACKEND_PID" "$EMPLOYER_PID" "$WORKER_PID"
exit 1
