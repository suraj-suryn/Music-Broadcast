#!/data/data/com.termux/files/usr/bin/bash
# ============================================
#  MUSIC BROADCASTING - SERVER CONTROL
#  With Internet Tunnel Support (serveo.net)
# ============================================

PROJECT_DIR="$HOME/Music-Broadcast"
TUNNEL_PID_FILE="$PROJECT_DIR/.tunnel.pid"
TUNNEL_URL_FILE="$PROJECT_DIR/.tunnel_url"

show_menu() {
    clear
    echo "============================================"
    echo "   MUSIC BROADCASTING SERVER CONTROL"
    echo "============================================"
    echo ""
    echo "  1. Start Server"
    echo "  2. Stop Server"
    echo "  3. Restart Server"
    echo "  4. Show Status"
    echo "  5. View Logs"
    echo "  6. Show IP Address"
    echo ""
    echo "  --- TUNNEL (Internet Access) ---"
    echo "  7. Start Tunnel"
    echo "  8. Stop Tunnel"
    echo "  9. Get Tunnel URL"
    echo ""
    echo "  0. Exit"
    echo ""
    read -p "Enter choice (0-9): " choice
    handle_choice $choice
}

start_server() {
    echo ""
    echo "Starting Music Server..."
    cd "$PROJECT_DIR"
    pm2 start server/server.js --name "music-server"
    pm2 save
    echo ""
    echo "Server started!"
    show_ip
    read -p "Press Enter to continue..."
}

stop_server() {
    echo ""
    echo "Stopping Music Server..."
    pm2 stop music-server
    echo "Server stopped."
    read -p "Press Enter to continue..."
}

restart_server() {
    echo ""
    echo "Restarting Music Server..."
    pm2 restart music-server
    echo "Server restarted!"
    show_ip
    read -p "Press Enter to continue..."
}

show_status() {
    echo ""
    pm2 status
    echo ""
    # Check tunnel status
    if [ -f "$TUNNEL_PID_FILE" ]; then
        TUNNEL_PID=$(cat "$TUNNEL_PID_FILE")
        if kill -0 "$TUNNEL_PID" 2>/dev/null; then
            echo "Tunnel: RUNNING (PID: $TUNNEL_PID)"
            if [ -f "$TUNNEL_URL_FILE" ]; then
                echo "URL: $(cat $TUNNEL_URL_FILE)"
            fi
        else
            echo "Tunnel: STOPPED"
        fi
    else
        echo "Tunnel: NOT STARTED"
    fi
    echo ""
    read -p "Press Enter to continue..."
}

show_logs() {
    echo ""
    echo "Showing last 30 lines of logs (Ctrl+C to exit)..."
    pm2 logs music-server --lines 30
}

show_ip() {
    echo ""
    echo "============================================"
    echo "   ACCESS YOUR SERVER"
    echo "============================================"
    echo ""
    # Get local IP
    LOCAL_IP=$(ifconfig 2>/dev/null | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
    if [ -z "$LOCAL_IP" ]; then
        LOCAL_IP=$(ip addr show 2>/dev/null | grep -Eo 'inet ([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
    fi
    
    echo "Local (same WiFi):  http://$LOCAL_IP:3001"
    echo "Localhost:          http://localhost:3001"
    
    # Show tunnel URL if available
    if [ -f "$TUNNEL_URL_FILE" ]; then
        TUNNEL_PID=$(cat "$TUNNEL_PID_FILE" 2>/dev/null)
        if kill -0 "$TUNNEL_PID" 2>/dev/null; then
            echo ""
            echo "Internet (Tunnel):  $(cat $TUNNEL_URL_FILE)"
        fi
    fi
    echo ""
}

# ============================================
#  TUNNEL FUNCTIONS
# ============================================

start_tunnel() {
    echo ""
    echo "Starting tunnel for internet access..."
    
    # Check if tunnel already running
    if [ -f "$TUNNEL_PID_FILE" ]; then
        TUNNEL_PID=$(cat "$TUNNEL_PID_FILE")
        if kill -0 "$TUNNEL_PID" 2>/dev/null; then
            echo "Tunnel already running (PID: $TUNNEL_PID)"
            if [ -f "$TUNNEL_URL_FILE" ]; then
                echo "URL: $(cat $TUNNEL_URL_FILE)"
            fi
            read -p "Press Enter to continue..."
            return
        fi
    fi
    
    # Check if openssh is installed
    if ! command -v ssh &> /dev/null; then
        echo "Installing openssh..."
        pkg install openssh -y
    fi
    
    echo ""
    echo "Choose tunnel provider:"
    echo "  1. serveo.net (recommended)"
    echo "  2. localhost.run"
    echo ""
    read -p "Enter choice (1-2): " tunnel_choice
    
    case $tunnel_choice in
        1)
            echo "Starting serveo.net tunnel..."
            # Run SSH tunnel in background and capture output
            ssh -o StrictHostKeyChecking=no -R 80:localhost:3001 serveo.net > "$TUNNEL_URL_FILE.log" 2>&1 &
            TUNNEL_PID=$!
            echo $TUNNEL_PID > "$TUNNEL_PID_FILE"
            
            echo "Waiting for tunnel URL..."
            sleep 5
            
            # Try to extract URL from log
            TUNNEL_URL=$(grep -o 'https://[a-zA-Z0-9]*\.serveo\.net' "$TUNNEL_URL_FILE.log" 2>/dev/null | head -1)
            if [ -n "$TUNNEL_URL" ]; then
                echo "$TUNNEL_URL" > "$TUNNEL_URL_FILE"
                echo ""
                echo "============================================"
                echo "   TUNNEL ACTIVE!"
                echo "============================================"
                echo ""
                echo "Share this URL: $TUNNEL_URL"
                echo ""
            else
                echo ""
                echo "Tunnel started but URL not captured yet."
                echo "Run './music-server.sh tunnel-url' in a few seconds."
                echo "Or check: cat $TUNNEL_URL_FILE.log"
            fi
            ;;
        2)
            echo "Starting localhost.run tunnel..."
            ssh -o StrictHostKeyChecking=no -R 80:localhost:3001 nokey@localhost.run > "$TUNNEL_URL_FILE.log" 2>&1 &
            TUNNEL_PID=$!
            echo $TUNNEL_PID > "$TUNNEL_PID_FILE"
            
            echo "Waiting for tunnel URL..."
            sleep 5
            
            TUNNEL_URL=$(grep -o 'https://[a-zA-Z0-9]*\.lhr\.life' "$TUNNEL_URL_FILE.log" 2>/dev/null | head -1)
            if [ -z "$TUNNEL_URL" ]; then
                TUNNEL_URL=$(grep -o 'https://[a-zA-Z0-9.-]*\.localhost\.run' "$TUNNEL_URL_FILE.log" 2>/dev/null | head -1)
            fi
            
            if [ -n "$TUNNEL_URL" ]; then
                echo "$TUNNEL_URL" > "$TUNNEL_URL_FILE"
                echo ""
                echo "============================================"
                echo "   TUNNEL ACTIVE!"
                echo "============================================"
                echo ""
                echo "Share this URL: $TUNNEL_URL"
                echo ""
            else
                echo ""
                echo "Tunnel started but URL not captured yet."
                echo "Check: cat $TUNNEL_URL_FILE.log"
            fi
            ;;
        *)
            echo "Invalid choice. Using serveo.net..."
            start_tunnel
            return
            ;;
    esac
    
    read -p "Press Enter to continue..."
}

stop_tunnel() {
    echo ""
    if [ -f "$TUNNEL_PID_FILE" ]; then
        TUNNEL_PID=$(cat "$TUNNEL_PID_FILE")
        if kill -0 "$TUNNEL_PID" 2>/dev/null; then
            kill $TUNNEL_PID 2>/dev/null
            echo "Tunnel stopped."
        else
            echo "Tunnel was not running."
        fi
        rm -f "$TUNNEL_PID_FILE" "$TUNNEL_URL_FILE" "$TUNNEL_URL_FILE.log"
    else
        echo "No tunnel running."
    fi
    read -p "Press Enter to continue..."
}

get_tunnel_url() {
    echo ""
    if [ -f "$TUNNEL_URL_FILE" ]; then
        TUNNEL_PID=$(cat "$TUNNEL_PID_FILE" 2>/dev/null)
        if kill -0 "$TUNNEL_PID" 2>/dev/null; then
            echo "============================================"
            echo "   TUNNEL URL"
            echo "============================================"
            echo ""
            cat "$TUNNEL_URL_FILE"
            echo ""
        else
            echo "Tunnel is not running."
        fi
    else
        # Try to extract from log
        if [ -f "$TUNNEL_URL_FILE.log" ]; then
            echo "Checking tunnel log..."
            TUNNEL_URL=$(grep -o 'https://[a-zA-Z0-9.-]*\.[a-z]*' "$TUNNEL_URL_FILE.log" | head -1)
            if [ -n "$TUNNEL_URL" ]; then
                echo "$TUNNEL_URL" > "$TUNNEL_URL_FILE"
                echo ""
                echo "Tunnel URL: $TUNNEL_URL"
                echo ""
            else
                echo "No tunnel URL found. Start tunnel first."
            fi
        else
            echo "No tunnel running. Start tunnel first (option 7)."
        fi
    fi
    read -p "Press Enter to continue..."
}

handle_choice() {
    case $1 in
        1) start_server ;;
        2) stop_server ;;
        3) restart_server ;;
        4) show_status ;;
        5) show_logs ;;
        6) show_ip; read -p "Press Enter to continue..." ;;
        7) start_tunnel ;;
        8) stop_tunnel ;;
        9) get_tunnel_url ;;
        0) echo "Goodbye!"; exit 0 ;;
        *) echo "Invalid choice"; sleep 1 ;;
    esac
    show_menu
}

# ============================================
#  QUICK COMMANDS SUPPORT
# ============================================
# Usage: ./music-server.sh [command]
# Commands: start, stop, restart, status, logs, ip
#           tunnel, tunnel-stop, tunnel-url

case "$1" in
    start)
        cd "$PROJECT_DIR"
        pm2 start server/server.js --name "music-server" 2>/dev/null || pm2 restart music-server
        pm2 save
        show_ip
        ;;
    stop)
        pm2 stop music-server
        echo "Server stopped."
        ;;
    restart)
        pm2 restart music-server
        show_ip
        ;;
    status)
        pm2 status
        if [ -f "$TUNNEL_PID_FILE" ]; then
            TUNNEL_PID=$(cat "$TUNNEL_PID_FILE")
            if kill -0 "$TUNNEL_PID" 2>/dev/null; then
                echo ""
                echo "Tunnel: RUNNING"
                [ -f "$TUNNEL_URL_FILE" ] && echo "URL: $(cat $TUNNEL_URL_FILE)"
            fi
        fi
        ;;
    logs)
        pm2 logs music-server --lines 50
        ;;
    ip)
        show_ip
        ;;
    tunnel)
        # Quick tunnel start with serveo.net
        if [ -f "$TUNNEL_PID_FILE" ]; then
            TUNNEL_PID=$(cat "$TUNNEL_PID_FILE")
            if kill -0 "$TUNNEL_PID" 2>/dev/null; then
                echo "Tunnel already running."
                [ -f "$TUNNEL_URL_FILE" ] && echo "URL: $(cat $TUNNEL_URL_FILE)"
                exit 0
            fi
        fi
        
        echo "Starting serveo.net tunnel..."
        ssh -o StrictHostKeyChecking=no -R 80:localhost:3001 serveo.net > "$TUNNEL_URL_FILE.log" 2>&1 &
        TUNNEL_PID=$!
        echo $TUNNEL_PID > "$TUNNEL_PID_FILE"
        sleep 5
        
        TUNNEL_URL=$(grep -o 'https://[a-zA-Z0-9]*\.serveo\.net' "$TUNNEL_URL_FILE.log" 2>/dev/null | head -1)
        if [ -n "$TUNNEL_URL" ]; then
            echo "$TUNNEL_URL" > "$TUNNEL_URL_FILE"
            echo "Tunnel URL: $TUNNEL_URL"
        else
            echo "Tunnel started. Run './music-server.sh tunnel-url' to get URL."
        fi
        ;;
    tunnel-stop)
        if [ -f "$TUNNEL_PID_FILE" ]; then
            kill $(cat "$TUNNEL_PID_FILE") 2>/dev/null
            rm -f "$TUNNEL_PID_FILE" "$TUNNEL_URL_FILE" "$TUNNEL_URL_FILE.log"
            echo "Tunnel stopped."
        else
            echo "No tunnel running."
        fi
        ;;
    tunnel-url)
        if [ -f "$TUNNEL_URL_FILE" ]; then
            cat "$TUNNEL_URL_FILE"
        elif [ -f "$TUNNEL_URL_FILE.log" ]; then
            TUNNEL_URL=$(grep -o 'https://[a-zA-Z0-9.-]*' "$TUNNEL_URL_FILE.log" | grep -E '\.(serveo\.net|lhr\.life|localhost\.run)' | head -1)
            [ -n "$TUNNEL_URL" ] && echo "$TUNNEL_URL" || echo "URL not found yet."
        else
            echo "No tunnel running."
        fi
        ;;
    *)
        show_menu
        ;;
esac
