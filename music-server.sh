#!/data/data/com.termux/files/usr/bin/bash
# ============================================
#  MUSIC BROADCASTING - SERVER CONTROL
# ============================================

PROJECT_DIR="$HOME/Music-Broadcast"

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
    echo "  7. Exit"
    echo ""
    read -p "Enter choice (1-7): " choice
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
    echo ""
}

handle_choice() {
    case $1 in
        1) start_server ;;
        2) stop_server ;;
        3) restart_server ;;
        4) show_status ;;
        5) show_logs ;;
        6) show_ip; read -p "Press Enter to continue..." ;;
        7) echo "Goodbye!"; exit 0 ;;
        *) echo "Invalid choice"; sleep 1 ;;
    esac
    show_menu
}

# Quick commands support
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
        ;;
    logs)
        pm2 logs music-server --lines 50
        ;;
    ip)
        show_ip
        ;;
    *)
        show_menu
        ;;
esac
