# 🎵 Music Broadcast

A real-time collaborative music room — create a room, share the code, and listen in sync with anyone on your network or across the internet.

## Features

### Playback
- **YouTube playback** — paste any YouTube URL; plays in sync for everyone with latency compensation
- **File upload** — upload MP3/WAV (up to 50 MB); streamed in sync across all clients
- **Per-viewer quality** — each viewer picks their own YouTube quality (Auto / 1080p / 720p / 480p / ...)
- **Song repeat / loop** — host can toggle 🔁 to loop the current song indefinitely
- **Queue loop** — host can toggle 🔄 to cycle played songs back to the end of the queue (plays forever)
- **Background playback** — Wake Lock keeps screen on; Media Session shows controls on lock screen; silent audio keepalive survives tab switch and screen lock

### Room & Controls
- **Room system** — 6-character shareable room code; no login required
- **Host controls** — play ▶ / pause ⏸ / skip ⏭ / repeat 🔁 / queue loop 🔄
- **Manual host transfer** — host can tap 👑 next to any user to hand over control
- **Vote to skip** — guests vote; majority auto-skips
- **Host restore** — if the host leaves or reloads, the next user becomes temp host; original host gets control back automatically when they rejoin with the same name
- **Live chat** — two-way chat; host and all guests can type; unread badge on mobile

### Invite
- **Invite link** — one-tap copy of a full join URL (`?join=ROOMCODE`)
- **QR code** — tap 📱 to show a scannable QR code; anyone scans with phone camera to join instantly
- **Auto-fill** — opening an invite link pre-fills the room code and switches to Join mode

### Player UI
- **Minimize / Restore / Maximize / Fullscreen** — size controls on the video overlay
- **Responsive layout** — auto-adapts to phone, tablet, and desktop; chat sidebar slides in as overlay on mobile with unread badge

### Network
- **LAN mode** — share your IP on the same Wi-Fi; zero config
- **Tunnel mode** — Cloudflare Tunnel for internet access; free, no bandwidth limits, WebSocket-compatible
- **Auto-tunnel scripts** — `start-tunnel.ps1` (Windows) and `start-tunnel.sh` (Android/Termux) auto-capture the tunnel URL and update config — no manual editing needed
- **Restart scripts** — `restart-server.ps1/.sh` restart only the server when code changes; tunnel keeps running uninterrupted
- **Mobile server** — run the server on an Android phone using Termux

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Real-time | Socket.io |
| Music (YouTube) | YouTube IFrame Player API (`youtube-nocookie.com`) |
| Music (upload) | Multer → HTML5 `<audio>` |
| State | In-memory (no database) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
git clone https://github.com/suraj-suryn/Music-Broadcast.git
cd Music-Broadcast
npm run install:all
```

### Run — development (LAN)

```bash
npm run dev
```

Starts both servers. The terminal prints your LAN IP — share it with devices on the same Wi-Fi:

| | URL |
|---|---|
| Your browser | http://localhost:5173 |
| Other devices (same Wi-Fi) | `http://<LAN-IP>:5173` |

### Run — production (serves built client from same port)

```bash
npm start
```

Builds the client then starts the Express server on port 3001. Use this with a Cloudflare Tunnel.

## Network Configuration

One file controls everything: **`network.config.json`**

```json
{
  "mode": "lan",
  "port": 3001,
  "tunnelUrl": ""
}
```

### LAN mode (default)

```json
{ "mode": "lan", "port": 3001, "tunnelUrl": "" }
```

Run `npm run dev`. LAN IP is printed on startup. All devices on the same Wi-Fi use that IP.

### Internet mode (Cloudflare Tunnel — free)

**Automatic (recommended):**

```bash
# Windows
powershell -ExecutionPolicy Bypass -File start-tunnel.ps1

# Android / Linux / macOS
chmod +x start-tunnel.sh && ./start-tunnel.sh
```

The script starts cloudflared, captures the generated URL, updates `network.config.json` automatically, and runs `npm start`. No manual editing.

**Manual:**

```bash
cloudflared tunnel --url http://localhost:3001
# copy the URL it prints, e.g. https://abc-xyz.trycloudflare.com
```

Then update `network.config.json`:
```json
{ "mode": "tunnel", "port": 3001, "tunnelUrl": "https://abc-xyz.trycloudflare.com" }
```

Run `npm start` — share the tunnel URL with anyone on the internet.

## How to Use

1. Open the app in a browser
2. Enter a display name → **Create Room** to get a 6-character code
3. Share the code with friends → they click **Join Room** → enter the code
4. **Host:** paste a YouTube URL or upload an audio file → press ▶ to play
5. **Guests:** vote to skip, chat, watch in the quality of their choice
6. **Invite others:** tap 🔗 to copy an invite link or 📱 for a QR code — opening the link auto-fills the room code

### Embeddable YouTube videos

Some videos block embedding. These always work:
- `https://youtu.be/dQw4w9WgXcQ` — Rick Astley
- `https://youtu.be/jfKfPfyJRdk` — Lofi Girl
- `https://youtu.be/L_jWHffIx5E` — Smash Mouth
- Uploaded MP3/WAV files always work with no restrictions

## Running on Android (Termux)

```bash
# Install Termux from F-Droid (not Play Store)
pkg update && pkg upgrade
pkg install nodejs git

git clone https://github.com/suraj-suryn/Music-Broadcast.git
cd Music-Broadcast
npm run install:all

# Optional: install cloudflared for internet access
pkg install cloudflared

# Start with auto-tunnel
chmod +x start-tunnel.sh && ./start-tunnel.sh

# Or LAN-only
npm run dev
```

Use `tmux` to run cloudflared and the server side-by-side: `pkg install tmux`.

## Project Structure

```
Music-Broadcast/
├── network.config.json        # ← switch LAN / tunnel here
├── start-tunnel.ps1           # Windows: auto-tunnel + start
├── start-tunnel.sh            # Android/Linux/macOS: auto-tunnel + start
├── restart-server.ps1         # Windows: restart server only (tunnel keeps running)
├── restart-server.sh          # Android/Linux: restart server only
├── package.json               # root scripts
├── client/                    # React + Vite frontend
│   ├── vite.config.js         # reads network.config.json
│   └── src/
│       ├── pages/             # Home.jsx (invite link support), Room.jsx
│       ├── components/        # MusicPlayer, Controls, Queue, AddSong,
│       │                      # Chat, UserList (host transfer), VoteSkip
│       ├── context/           # RoomContext.jsx
│       └── socket.js          # Socket.io client
└── server/                    # Node.js backend
    ├── server.js              # Express + Socket.io
    └── src/
        ├── rooms.js           # In-memory room store
        ├── socketHandlers.js  # All socket events
        └── routes/upload.js   # Multer audio upload
```

## Scripts

| Command | Description |
|---|---|
| `npm run install:all` | Install all dependencies (root + server + client) |
| `npm run dev` | Start both server and Vite dev server (LAN mode) |
| `npm run build` | Build the client for production |
| `npm start` | Build client + start production server |
| `npm run start:dev` | Start server only (skip rebuild) |
| `./start-tunnel.ps1` | Windows: auto-tunnel, update config, start |
| `./start-tunnel.sh` | Android/Linux: auto-tunnel, update config, start |
| `./restart-server.ps1` | Windows: restart server only (tunnel keeps running) |
| `./restart-server.sh` | Android/Linux: restart server only |

## Version History

| Tag | Changes |
|---|---|
| v8+ | Queue loop 🔄, manual host transfer, invite link + QR code, background playback fixes |
| v7 | Responsive layout — mobile sidebar overlay, chat unread badge |
| v6 | Background playback (Wake Lock + Media Session), song repeat 🔁 |
| v5 | Per-viewer YouTube quality selector |
| v4 | Video size controls (min/normal/max/fullscreen) |
| v3 | Host restore on rejoin |
| v2 | Startup config fix, YouTube embed error handling |
| v1 | Initial release |
