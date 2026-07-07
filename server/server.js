const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const os = require('os');
const fs = require('fs');

// ── Load network config ──────────────────────────────────────
const networkConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../network.config.json'), 'utf-8')
);
const PORT = networkConfig.port || 3001;
const MODE = networkConfig.mode || 'lan';

// ── CORS origin ──────────────────────────────────────────────
// LAN mode: allow everything (any device on the network can connect)
// Tunnel mode: allow only the tunnel URL + local dev
const corsOrigin = MODE === 'tunnel' && networkConfig.tunnelUrl
  ? [networkConfig.tunnelUrl, 'http://localhost:5173', 'http://127.0.0.1:5173']
  : true;

// ── Express app ──────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// ── Uploads directory ────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/upload', require('./src/routes/upload'));

// ── Serve built client (tunnel / production mode) ────────────
// In tunnel mode the Vite dev server is not exposed, so we serve
// the pre-built React app directly from Express on the same port.
const distPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ── Socket.io ────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling']
});

const registerHandlers = require('./src/socketHandlers');
io.on('connection', socket => {
  registerHandlers(io, socket);
});

// ── Start ────────────────────────────────────────────────────
function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  const lanIp = getLanIp();
  console.log('\n🎵  Music Broadcasting Server');
  console.log('─────────────────────────────────');
  console.log(`  Mode    : ${MODE === 'tunnel' ? 'Tunnel (internet)' : 'LAN (same network)'}`);
  if (MODE === 'tunnel') {
    const url = networkConfig.tunnelUrl || '(set tunnelUrl in network.config.json)';
    console.log(`  URL     : ${url}`);
  } else {
    console.log(`  LAN     : http://${lanIp}:${PORT}  ← share this`);
    console.log(`  Local   : http://localhost:${PORT}`);
  }
  console.log('─────────────────────────────────\n');
});
