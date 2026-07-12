#!/data/data/com.termux/files/usr/bin/bash
# ============================================
#  GET MUSIC SERVER URL
#  Quick script to display all access URLs
# ============================================

PROJECT_DIR="$HOME/Music-Broadcast"
TUNNEL_URL_FILE="$PROJECT_DIR/.tunnel_url"
TUNNEL_PID_FILE="$PROJECT_DIR/.tunnel.pid"

echo ""
echo "============================================"
echo "   MUSIC SERVER - ACCESS URLs"
echo "============================================"
echo ""

# Get local IP
LOCAL_IP=$(ifconfig 2>/dev/null | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP=$(ip addr show 2>/dev/null | grep -Eo 'inet ([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
fi

echo "LOCAL ACCESS (same WiFi network):"
echo "  http://$LOCAL_IP:3001"
echo ""

# Check tunnel
TUNNEL_RUNNING=false
if [ -f "$TUNNEL_PID_FILE" ]; then
    TUNNEL_PID=$(cat "$TUNNEL_PID_FILE")
    if kill -0 "$TUNNEL_PID" 2>/dev/null; then
        TUNNEL_RUNNING=true
    fi
fi

if [ "$TUNNEL_RUNNING" = true ]; then
    echo "INTERNET ACCESS (share with anyone):"
    
    # Try to get URL from file
    if [ -f "$TUNNEL_URL_FILE" ]; then
        TUNNEL_URL=$(cat "$TUNNEL_URL_FILE")
        echo "  $TUNNEL_URL"
    else
        # Try to extract from log
        if [ -f "$TUNNEL_URL_FILE.log" ]; then
            TUNNEL_URL=$(grep -oE 'https://[a-zA-Z0-9.-]+\.(serveo\.net|lhr\.life|localhost\.run)' "$TUNNEL_URL_FILE.log" | head -1)
            if [ -n "$TUNNEL_URL" ]; then
                echo "$TUNNEL_URL" > "$TUNNEL_URL_FILE"
                echo "  $TUNNEL_URL"
            else
                echo "  (URL not captured yet - check log)"
            fi
        else
            echo "  (URL file not found)"
        fi
    fi
else
    echo "INTERNET ACCESS:"
    echo "  Tunnel not running!"
    echo "  Start with: ./music-server.sh tunnel"
fi

echo ""
echo "============================================"

# Copy to clipboard if termux-api installed
if command -v termux-clipboard-set &> /dev/null; then
    if [ "$TUNNEL_RUNNING" = true ] && [ -f "$TUNNEL_URL_FILE" ]; then
        cat "$TUNNEL_URL_FILE" | termux-clipboard-set
        echo "Tunnel URL copied to clipboard!"
        echo ""
    fi
fi
