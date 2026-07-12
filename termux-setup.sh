#!/data/data/com.termux/files/usr/bin/bash
# ============================================
#  MUSIC BROADCASTING - TERMUX SETUP SCRIPT
# ============================================

echo "============================================"
echo "   Music Broadcasting - Termux Setup"
echo "============================================"
echo ""

# Update packages
echo "[1/6] Updating Termux packages..."
pkg update -y && pkg upgrade -y

# Install Node.js and Git
echo "[2/6] Installing Node.js and Git..."
pkg install nodejs git -y

# Clone repository
echo "[3/6] Cloning Music-Broadcast repository..."
cd ~
if [ -d "Music-Broadcast" ]; then
    echo "Repository already exists. Pulling latest..."
    cd Music-Broadcast
    git pull
else
    git clone https://github.com/suraj-suryn/Music-Broadcast.git
    cd Music-Broadcast
fi

# Install server dependencies
echo "[4/6] Installing server dependencies..."
cd server
npm install
cd ..

# Install client dependencies and build
echo "[5/6] Building client..."
cd client
npm install
npm run build
cd ..

# Install PM2 for process management
echo "[6/6] Installing PM2..."
npm install -g pm2

# Set YouTube API Key
echo ""
echo "============================================"
echo "   Setup Complete!"
echo "============================================"
echo ""
echo "IMPORTANT: Set your YouTube API key:"
echo ""
echo "  export YOUTUBE_API_KEY=\"your_api_key_here\""
echo ""
echo "Add to ~/.bashrc for persistence:"
echo "  echo 'export YOUTUBE_API_KEY=\"your_key\"' >> ~/.bashrc"
echo ""
echo "Then run: ./music-server.sh start"
echo ""
