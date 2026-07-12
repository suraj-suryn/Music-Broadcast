#!/data/data/com.termux/files/usr/bin/bash
# ============================================
#  GET MUSIC SERVER URL
#  Displays URLs and updates network.config.json
# ============================================

PROJECT_DIR="$HOME/Music-Broadcast"
TUNNEL_URL_FILE="$PROJECT_DIR/.tunnel_url"
TUNNEL_PID_FILE="$PROJECT_DIR/.tunnel.pid"
NETWORK_CONFIG="$PROJECT_DIR/network.config.json"

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
TUNNEL_URL=""

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
    else
        # Try to extract from log
        if [ -f "$TUNNEL_URL_FILE.log" ]; then
            TUNNEL_URL=$(grep -oE 'https://[a-zA-Z0-9.-]+\.(serveo\.net|lhr\.life|localhost\.run)' "$TUNNEL_URL_FILE.log" | head -1)
            if [ -n "$TUNNEL_URL" ]; then
                echo "$TUNNEL_URL" > "$TUNNEL_URL_FILE"
            fi
        fi
    fi
    
    if [ -n "$TUNNEL_URL" ]; then
        echo "  $TUNNEL_URL"
        
        # Update network.config.json
        if [ -f "$NETWORK_CONFIG" ]; then
            # Check if jq is available
            if command -v jq &> /dev/null; then
                # Use jq for proper JSON update
                TMP_CONFIG=$(mktemp)
                jq --arg url "$TUNNEL_URL" '.tunnelUrl = $url' "$NETWORK_CONFIG" > "$TMP_CONFIG"
                mv "$TMP_CONFIG" "$NETWORK_CONFIG"
                echo ""
                echo "Updated network.config.json with tunnel URL"
            else
                # Fallback: sed replacement
                sed -i "s|\"tunnelUrl\":.*|\"tunnelUrl\": \"$TUNNEL_URL\",|g" "$NETWORK_CONFIG"
                echo ""
                echo "Updated network.config.json with tunnel URL"
            fi
        else
            # Create network.config.json
            cat > "$NETWORK_CONFIG" << EOF
{
  "mode": "tunnel",
  "port": 3001,
  "tunnelUrl": "$TUNNEL_URL",
  "youtubeApiKey": ""
}
EOF
            echo ""
            echo "Created network.config.json with tunnel URL"
        fi
    else
        echo "  (URL not captured yet - check log)"
    fi
else
    echo "INTERNET ACCESS:"
    echo "  Tunnel not running!"
    echo "  Start with: ./music-server.sh tunnel"
fi

echo ""
echo "============================================"

# Show current network.config.json
if [ -f "$NETWORK_CONFIG" ]; then
    echo ""
    echo "network.config.json:"
    cat "$NETWORK_CONFIG"
    echo ""
fi

# Copy to clipboard if termux-api installed
if command -v termux-clipboard-set &> /dev/null; then
    if [ -n "$TUNNEL_URL" ]; then
        echo "$TUNNEL_URL" | termux-clipboard-set
        echo "Tunnel URL copied to clipboard!"
        echo ""
    fi
fi
