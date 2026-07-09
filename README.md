# 🎵 Music Broadcast

A real-time collaborative music room — create a room, share the code, and listen in sync with anyone on your network or across the internet.

## Features

### Playback
- **YouTube search** — search YouTube directly from the room; host (or guests suggesting) get 8 embeddable results with thumbnails
- **YouTube URL / direct audio link** — paste any YouTube URL *or* a direct audio link (mp3, wav, ogg, m4a); added by title auto-detection
- **File upload** — upload MP3/WAV (up to 50 MB); streamed in sync across all clients
- **Seek / progress bar** — draggable time bar with `0:00 / 4:23` display; host can seek to any position
- **Per-viewer quality** — each viewer picks their own YouTube quality (Auto / 1080p / 720p / 480p / ...)
- **Repeat cycle** — one button cycles: Off → Repeat All (queue loops forever) → Repeat One (current song loops) → Off
- **Background playback** — Wake Lock keeps screen on; Media Session shows controls on lock screen; silent audio keepalive survives tab switch and screen lock; auto-reconnect re-syncs on foreground return

### Room & Controls
- **Room system** — 6-character shareable room code; no login required
- **Host controls** — play ▶ / pause ⏸ / skip ⏭ / repeat cycle
- **Keyboard shortcuts** — `Space` play/pause, `→` next, `R` repeat cycle (host only; blocked while typing)
- **Guest song suggestions** — guests search and suggest songs; host sees a 💡 panel with approve ✓ / reject ✕ per suggestion; suggestions update live for everyone
- **Manual host transfer** — host taps 👑 next to any user to hand over control
- **Kick user** — host can tap 🚫 next to any user to remove them; kicked user is redirected home with a message
- **Vote to skip** — guests vote; majority auto-skips
- **Host restore** — if the host leaves or reloads, the next user becomes temp host; original host gets control back automatically when they rejoin with the same name
- **Auto-reconnect** — brief network drop shows "Reconnecting…" overlay; auto-rejoins and re-syncs without navigating away
- **Live chat** — two-way chat; host and all guests can type; unread badge

### Invite & Sharing
- **Invite link** — one-tap copy of a full join URL (`?join=ROOMCODE`)
- **QR code** — tap 📱 to show a scannable QR code; anyone scans with phone camera to join instantly
- **Invite link safety** — opening an invite link pre-fills the room code, locks to Join mode, and disables Create Room to prevent accidental new rooms
- **Export playlist** — 💾 button downloads a `.txt` file with all played + current + queued songs with their YouTube URLs
- **Import playlist** — 📋 tab in Add Song uploads any `.txt` file; scans for YouTube URLs and bulk-adds all songs to the queue

### Queue
- **Queue reorder** — host can reorder queued songs with ▲ ▼ buttons
- **Queue loop mode** — included in the repeat cycle (Repeat All)
- **Song deduplication** — search results clear after adding so the screen stays clean

### Player UI
- **Now-playing toast** — brief `▶ Song Title` notification when track changes
- **Minimize / Restore / Maximize / Fullscreen** — size controls on the video overlay
- **Responsive layout** — auto-adapts to phone, tablet, and desktop; chat sidebar starts closed (open with 💬), slides in as overlay on all screen sizes

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
3. Share the code (or the invite link via 🔗 / QR via 📱) with friends
4. **Host:** search YouTube, paste a URL, or upload an audio file → ▶ to play
5. **Guests:** search and suggest songs (host approves 💡), vote to skip, chat
6. **Seek:** drag the progress bar to jump to any position (host only)
7. **Repeat:** click 🔁 to cycle Off → Repeat All → Repeat One
8. **Export:** click 💾 anytime to save the session's songs as a `.txt` file
9. **Import:** use the 📋 tab in Add Song to load a saved `.txt` playlist

### Keyboard shortcuts (host only, blocked while typing in chat/inputs)

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `→` | Skip to next song |
| `R` | Cycle repeat mode |

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
│       ├── components/        # MusicPlayer, Controls (seek bar, repeat cycle),
│       │                      # Queue (reorder), AddSong (search/URL/upload/import),
│       │                      # Suggestions (host approval panel), Chat,
│       │                      # UserList (host transfer + kick), VoteSkip
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

| Version | Changes |
|---|---|
| **v9.2** | Emoji reactions 😊😢😭😡🔥❤️👏😂 (floating animation, real-time broadcast), message notification toast (bottom-left when sidebar closed), Co-DJ mode 🎧 toggle (guests add directly, host controls with one button) |
| **v9.1** | Song duplicate warning (⚠️ blocks re-adding same song), volume slider for uploaded audio, username rename mid-session (✏️), LAN/Public network toggle for invite links |
| **v9** | Guest song suggestions (💡 approve/reject), seek/progress bar, queue reorder ▲▼, repeat cycle (Off→All→One), keyboard shortcuts, auto-reconnect overlay, now-playing toast, invite link safety (locked join mode), host kick user 🚫, direct audio URL link, playlist export 💾 + import 📋, song play history, chat sidebar closed by default, Vite dev proxy for YouTube search API |
| v8 | YouTube search, queue loop 🔄, manual host transfer 👑, invite link + QR code, background playback fixes (persistent keepalive, Media Session play/pause, visibility re-sync) |
| v7 | Responsive layout — mobile sidebar overlay, chat unread badge |
| v6 | Background playback (Wake Lock + Media Session), song repeat 🔁 |
| v5 | Per-viewer YouTube quality selector |
| v4 | Video size controls (min/normal/max/fullscreen) |
| v3 | Host restore on rejoin |
| v2 | Startup config fix, YouTube embed error handling |
| v1 | Initial release |
