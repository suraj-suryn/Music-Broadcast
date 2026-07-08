#!/bin/bash
# restart-server.sh
# Stops the running server and restarts it — no rebuild, tunnel keeps running

ROOT="$(cd "$(dirname "$0")" && pwd)"
PORT=$(node -e "try{const c=require('$ROOT/network.config.json');console.log(c.port||3001)}catch(e){console.log(3001)}" 2>/dev/null)
PORT=${PORT:-3001}

echo ""
echo "🔄  Restarting server on port $PORT..."

# Kill whatever is using the port
fuser -k "${PORT}/tcp" 2>/dev/null
pkill -f "node server.js" 2>/dev/null
sleep 0.4

echo "Server starting..."
cd "$ROOT" && npm run start:dev
