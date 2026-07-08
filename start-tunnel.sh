#!/bin/bash
# start-tunnel.sh
# Auto-starts cloudflared, captures tunnel URL, updates network.config.json, runs npm start
# Works on: Android (Termux), Linux, macOS

ROOT="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$ROOT/network.config.json"

echo ""
echo "🎵  Music Broadcast - Auto Tunnel"
echo "──────────────────────────────────"
echo ""

# ── Read port from config ─────────────────────────────────
PORT=$(node -e "try{const c=require('$CONFIG');console.log(c.port||3001)}catch(e){console.log(3001)}" 2>/dev/null)
PORT=${PORT:-3001}
echo "Port: $PORT"

# ── Check cloudflared ─────────────────────────────────────
if ! command -v cloudflared &>/dev/null; then
    echo ""
    echo "ERROR: cloudflared not found."
    echo "Install with:  pkg install cloudflared"
    echo "Or download:   https://github.com/cloudflare/cloudflared/releases/latest"
    exit 1
fi

# ── Start cloudflared in background ──────────────────────
echo "Starting cloudflared..."
TMPFILE=$(mktemp)
cloudflared tunnel --url "http://localhost:$PORT" >"$TMPFILE" 2>&1 &
CF_PID=$!

# ── Poll for URL (max 20 s) ───────────────────────────────
URL=""
TICKS=0
printf "Waiting for tunnel URL "
while [ -z "$URL" ] && [ "$TICKS" -lt 40 ]; do
    sleep 0.5
    TICKS=$((TICKS + 1))
    printf "."
    URL=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' "$TMPFILE" | head -1)
done
echo ""
rm -f "$TMPFILE"

if [ -z "$URL" ]; then
    echo "ERROR: Tunnel URL not received within 20 seconds."
    kill "$CF_PID" 2>/dev/null
    exit 1
fi

echo "Tunnel URL : $URL"

# ── Update network.config.json using node ────────────────
node -e "
const fs  = require('fs');
const cfg = JSON.parse(fs.readFileSync('$CONFIG', 'utf8'));
cfg.mode      = 'tunnel';
cfg.tunnelUrl = '$URL';
fs.writeFileSync('$CONFIG', JSON.stringify(cfg, null, 2));
console.log('Config updated ✓');
"

echo ""
echo "Building and starting server..."
echo ""

# ── npm start ─────────────────────────────────────────────
cd "$ROOT" || exit 1
npm start

# ── Cleanup ───────────────────────────────────────────────
echo ""
echo "Stopping cloudflared tunnel..."
kill "$CF_PID" 2>/dev/null
echo "Done."
