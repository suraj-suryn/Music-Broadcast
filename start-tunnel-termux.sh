#!/data/data/com.termux/files/usr/bin/bash
# ============================================
#  START TUNNEL - Internet Access for Music Server
#  Runs in foreground, shows URL directly
# ============================================

PROJECT_DIR="$HOME/Music-Broadcast"
NETWORK_CONFIG="$PROJECT_DIR/network.config.json"

# Get local IP
LOCAL_IP=$(ifconfig 2>/dev/null | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP=$(ip addr show 2>/dev/null | grep -Eo 'inet ([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
fi

clear
echo "============================================"
echo "   MUSIC BROADCASTING - TUNNEL"
echo "============================================"
echo ""
echo "Local URL: http://$LOCAL_IP:3001"
echo ""
echo "Starting serveo.net tunnel..."
echo "Your public URL will appear below."
echo ""
echo "Press Ctrl+C to stop the tunnel."
echo "============================================"
echo ""

# Function to update config when URL is found
update_config() {
    TUNNEL_URL="$1"
    if [ -f "$NETWORK_CONFIG" ]; then
        if command -v jq &> /dev/null; then
            TMP_CONFIG=$(mktemp)
            jq --arg url "$TUNNEL_URL" '.tunnelUrl = $url' "$NETWORK_CONFIG" > "$TMP_CONFIG"
            mv "$TMP_CONFIG" "$NETWORK_CONFIG"
        else
            sed -i "s|\"tunnelUrl\":.*|\"tunnelUrl\": \"$TUNNEL_URL\",|g" "$NETWORK_CONFIG"
        fi
    fi
}

# Run SSH and capture URL in real-time
ssh -o StrictHostKeyChecking=no -R 80:localhost:3001 serveo.net 2>&1 | while read line; do
    echo "$line"
    
    # Look for the forwarding URL
    if echo "$line" | grep -q "Forwarding"; then
        TUNNEL_URL=$(echo "$line" | grep -oE 'https://[a-zA-Z0-9.-]+')
        if [ -n "$TUNNEL_URL" ]; then
            echo ""
            echo "============================================"
            echo "   SHARE THIS URL:"
            echo "   $TUNNEL_URL"
            echo "============================================"
            echo ""
            update_config "$TUNNEL_URL"
        fi
    fi
done
