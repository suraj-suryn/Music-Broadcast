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
- **Room system** — 6-character shareable room code; no login required; optional password at creation
- **Host controls** — ⏮ previous / ▶⏸ play-pause / ⏭ next / 🔀 shuffle / 🔂 repeat cycle / 🎧 Co-DJ toggle
- **Keyboard shortcuts** — `Space` play/pause, `→` next, `R` repeat cycle (host only; blocked while typing)
- **Sleep timer** — ⏰ button in header; auto-pauses after 5/10/15/30/60 min; countdown shown on button
- **Skip announcement** — when a song is skipped, a brief toast shows who skipped it
- **Jump to song** — host clicks any queued song title to start it immediately
- **Guest song suggestions** — guests search and suggest songs; host sees a 💡 panel with approve ✓ / reject ✕ per suggestion; suggestions update live for everyone
- **Co-DJ mode** — host toggles 🎧 to let guests add songs directly to the queue (no approval needed); one click switches between suggestion mode and open queue
- **Share control** — host taps 👑 next to any user to share host controls; both retain control simultaneously
- **Revoke control** — host taps ↩ to remove co-host status from any non-creator user
- **Kick user** — host can tap 🚫 next to any user to remove them; kicked user is redirected home with a message
- **Rename yourself** — any user can tap ✏️ next to their own name to change their display name mid-session
- **Vote to skip** — guests vote; majority auto-skips
- **Host restore** — if the host leaves or reloads, the next user becomes temp host; original host gets control back automatically when they rejoin with the same name
- **Auto-reconnect** — brief network drop shows "Reconnecting…" overlay; auto-rejoins and re-syncs without navigating away; rejoins even after mobile page reload
- **Live chat** — two-way chat; host and all guests can type; unread badge; message notification toast appears when sidebar is closed

### Room Security
- **Room password** — optional password at creation; blocks anyone who doesn't know it
- **Join Approval** — host toggles 🚪 to review each person before they enter; approved/rejected individually
- **Creator badge** — room creator (👑) cannot be kicked or have controls revoked; always has the highest authority

### Reactions & Social
- **Emoji reactions** — 😊 😢 😭 😡 🔥 ❤️ 👏 😂 reaction bar below the player; click any emoji → it floats up for all users in real time; ephemeral, no storage
- **Join notification** — brief toast shows when someone new enters the room
- **Message notification toast** — when a chat message arrives while sidebar is closed, a clickable toast shows sender name + message at bottom-left

### Invite & Sharing
- **Invite link** — one-tap copy of a full join URL (`?join=ROOMCODE`)
- **QR code** — tap 📱 to show a scannable QR code; anyone scans with phone camera to join instantly
- **Invite link safety** — opening an invite link pre-fills the room code, locks to Join mode, and disables Create Room to prevent accidental new rooms
- **Export playlist** — 💾 button downloads a `.txt` file with all played + current + queued songs with their YouTube URLs
- **Import playlist** — 📋 tab in Add Song uploads any `.txt` file; scans for YouTube URLs and bulk-adds all songs to the queue

### Queue
- **Queue reorder** — host can reorder queued songs with ▲ ▼ buttons
- **Queue loop mode** — included in the repeat cycle (Repeat All)
- **Song deduplication** — ⚠️ warning if you try to add a song already in the queue or playing
- **Search clears after adding** — search results hide after a song is added, keeping the screen clean

### Player UI
- **Now-playing toast** — brief `▶ Song Title` notification when track changes
- **Volume slider** — 🔈──🔊 range slider in the uploaded audio player (your device only, not synced)
- **Minimize / Restore / Maximize / Fullscreen** — size controls on the video overlay
- **Responsive layout** — auto-adapts to phone, tablet, and desktop; chat sidebar starts closed (open with 💬), slides in as overlay on all screen sizes

### Network
- **LAN mode** — share your IP on the same Wi-Fi; zero config
- **Tunnel mode** — Cloudflare Tunnel for internet access; free, no bandwidth limits, WebSocket-compatible
- **LAN/Public toggle** — 📶/🌐 button in room header switches invite links between LAN IP and tunnel URL (only shown when tunnel is configured)
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

## User Guide

### Quick Start

**Create a Room (you = host)**
1. Open the app → enter your display name → **Create Room**
2. Optionally set a **room password** (leave blank for open access)
3. Share via **🔗 invite link** or **📱 QR code**
4. Add songs and press ▶ to start

**Join a Room (you = guest)**
1. Open the invite link — or tap **Join Room** → enter the 6-digit code
2. Enter your name → **Join Room**
3. If host has approval ON → wait for the host to let you in

---

### Host Controls

#### Playback bar (bottom of player)

| Button | Action |
|---|---|
| ⏮ | Previous song |
| ▶ / ⏸ | Play / Pause |
| ⏭ | Skip to next |
| 🔀 | Shuffle remaining queue |
| 🔂 | Repeat: Off → All → One → Off |
| 🎧 | Co-DJ mode: guests add directly (no approval) |

**Progress bar** — drag to seek to any position

#### Header buttons

| Button | Action |
|---|---|
| 🔗 | Copy invite link |
| 📱 | Show QR code |
| 💾 | Download playlist (auto-saves every song played) |
| ⏰ | Sleep timer: auto-pause after 5/10/15/30/60 min |
| 💬 | Open/close chat & users panel |

#### Keyboard shortcuts (desktop, blocked while typing)

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `→` | Skip to next |
| `R` | Cycle repeat mode |

---

### Adding Songs (Host & Co-DJ)

| Tab | Use for |
|---|---|
| 🔍 Search | Search YouTube — 8 embeddable results with thumbnails |
| 🔗 URL | Paste a YouTube URL or direct audio link (mp3/wav/ogg) |
| 📁 Upload | Upload MP3/WAV file (max 50 MB) |
| 📋 Import | Upload a `.txt` file of YouTube URLs — bulk-adds all |

> **Auto-save**: Every song is saved to your browser's local storage as it's played. The 💾 button shows how many songs are saved and exports them all.

---

### Queue Management (Host)

- **▲ ▼** — reorder songs
- **✕** — remove a song
- **Click song title** — jump to it immediately (skips everything before it)
- **🔀** — shuffle the entire queue

---

### Guest Features

| Feature | How |
|---|---|
| **Suggest a song** | Search/URL → click 💡 → host sees it and approves ✓ or rejects ✕ |
| **Co-DJ mode** | When host enables 🎧, guests add directly — no approval |
| **Vote to skip** | Tap ⏭ Vote Skip — majority vote skips the song |
| **Emoji reactions** | Tap 😊😢😭😡🔥❤️👏😂 — floats on everyone's screen |
| **Chat** | Type in the sidebar — messages shown for all |
| **Rename** | Tap ✏️ next to your name in the user list |

---

### Room Security

| Layer | How to set it | Best for |
|---|---|---|
| **Room code** | Always active | Basic access control |
| **Password** | Set at room creation | Public/shared links |
| **Join Approval 🚪** | Toggle in the room | Small private groups |

> **Tip**: For maximum security, set a password at creation AND enable Join Approval in the room.

---

### User Management (Host)

| Button | Action |
|---|---|
| **👑** next to a guest | Share host controls — both of you now have full access |
| **↩** next to a co-host | Revoke their controls (can't revoke the room creator) |
| **🚫** next to any user | Kick from room — they see a rejection message |
| **✏️** next to your own name | Rename yourself |

---

### Mobile Tips

| Platform | Recommendation |
|---|---|
| **Android** | Use **Chrome** — best background audio support |
| **iPhone** | Use **Safari** — all iOS browsers are the same engine; keep screen on |
| **All phones** | If music stops after switching apps, return to browser — it auto-resyncs |
| **Add to Home Screen** | Tap Share → "Add to Home Screen" for a near-native app feel |

> **iPhone background limitation**: YouTube audio cannot play in background on iOS — this is an Apple platform restriction. Music will resume at the correct position when you return to the browser.

---

### Troubleshooting

| Problem | Solution |
|---|---|
| "This video cannot be embedded" | Owner blocked embedding — try a different version or upload MP3 |
| Music stops on iPhone | iOS limitation — keep browser open, use Lock Screen controls |
| Disconnected / room lost | App reconnects automatically; if room expired, ask host to recreate |
| Search not working | YouTube API key not set in `network.config.json` |
| Can't copy room code | Fix: run on HTTPS or localhost; LAN HTTP has clipboard restrictions |

---

### Playlist Persistence

Songs are **auto-saved to your browser's local storage** as they're added/played — no manual action needed.

- The 💾 button shows a badge with the count of saved songs
- Click 💾 to download a `.txt` file of all songs in the session
- Use 📋 Import tab to reload a saved playlist in any future session
- Each room gets its own storage key — different rooms never overwrite each other

---

### Embeddable YouTube Videos

Some videos block embedding. These always work:
- `https://youtu.be/dQw4w9WgXcQ` — Rick Astley
- `https://youtu.be/jfKfPfyJRdk` — Lofi Girl
- `https://youtu.be/L_jWHffIx5E` — Smash Mouth
- Uploaded MP3/WAV files always work — no restrictions

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
│       ├── components/        # MusicPlayer, Controls (seek bar, repeat cycle, Co-DJ),
│       │                      # Queue (reorder), AddSong (search/URL/upload/import),
│       │                      # Suggestions (host approval + co-DJ panel), Chat,
│       │                      # UserList (host transfer + kick + rename),
│       │                      # VoteSkip, ReactionBar (emoji reactions)
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
| **latest** | Queue shuffle 🔀, previous song ⏮, sleep timer ⏰, skip announcement toast, click-to-play queued songs, join notifications, host approval gate 🚪, room password, share/revoke control (multi-host), auto-save playlist to localStorage, sessionStorage mobile rejoin fix, clipboard fallback for LAN HTTP |
| **v9.2** | Emoji reactions 😊😢😭😡🔥❤️👏😂, message notification toast, Co-DJ mode 🎧 |
| **v9.1** | Song duplicate warning, volume slider, username rename ✏️, LAN/Public network toggle |
| **v9** | Guest suggestions 💡, seek bar, queue reorder ▲▼, repeat cycle, keyboard shortcuts, auto-reconnect, now-playing toast, invite link safety, kick user 🚫, audio URL link, playlist export/import 💾📋, song history |
| v8 | YouTube search, queue loop, host transfer, invite link + QR code, background playback fixes |
| v7 | Responsive layout — mobile sidebar overlay, chat unread badge |
| v6 | Background playback (Wake Lock + Media Session), song repeat |
| v5 | Per-viewer YouTube quality selector |
| v4 | Video size controls (min/normal/max/fullscreen) |
| v3 | Host restore on rejoin |
| v2 | Startup config fix, YouTube embed error handling |
| v1 | Initial release |
