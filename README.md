# 🎵 Music Broadcast

A real-time collaborative music room — create a room, share the code, and listen in sync with anyone on your network or across the internet.

## Features

- **Room system** — create a room and get a 6-character shareable code; others join instantly
- **YouTube playback** — paste any YouTube URL to queue it; plays in sync for everyone
- **File upload** — upload MP3/WAV files (up to 50 MB) and play them in the room
- **Real-time sync** — all users hear the same song at the same position with latency compensation
- **Host controls** — the room creator controls play, pause, and skip
- **Vote to skip** — guests vote to skip the current song; majority triggers auto-skip
- **Live chat** — real-time chat panel inside the room
- **User list** — see everyone in the room; host is marked with a crown 👑
- **Auto host promotion** — if the host leaves, the next user is promoted automatically
- **Network flexibility** — works on LAN (same Wi-Fi) or over the internet via Cloudflare Tunnel

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Real-time | Socket.io |
| Music (YouTube) | YouTube IFrame Player API |
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

### Run (development)

```bash
npm run dev
```

This starts both servers together:

| Server | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| Backend (Express + Socket.io) | http://localhost:3001 |

The terminal will also print the LAN URL (e.g. `http://192.168.1.x:5173`) — share that with anyone on the same Wi-Fi.

## Network Configuration

All network settings live in one file at the root: **`network.config.json`**

```json
{
  "mode": "lan",
  "port": 3001,
  "tunnelUrl": ""
}
```

### Same network (LAN) — default

```json
{ "mode": "lan", "port": 3001, "tunnelUrl": "" }
```

Run `npm run dev` — the LAN IP is printed on startup. Share it with friends on the same Wi-Fi. No other changes needed.

### Over the internet (free, no disturbance)

Uses [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/) — free, supports WebSockets, no bandwidth limits.

1. Install `cloudflared` → [download here](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
2. In a separate terminal:
   ```bash
   cloudflared tunnel --url http://localhost:3001
   ```
3. Copy the generated URL (e.g. `https://abc-xyz.trycloudflare.com`)
4. Edit `network.config.json`:
   ```json
   { "mode": "tunnel", "port": 3001, "tunnelUrl": "https://abc-xyz.trycloudflare.com" }
   ```
5. Run `npm run dev` — share the Vite URL with anyone anywhere

## How to Use

1. Open http://localhost:5173 in your browser
2. Enter a display name and click **Create Room**
3. The 6-character room code appears in the top bar — share it
4. Friends go to the same URL, enter a name, click **Join Room**, type the code
5. As host: paste a YouTube URL or upload an audio file, then hit ▶ to play
6. Guests can chat and vote to skip songs

## Project Structure

```
Music-Broadcast/
├── network.config.json        # ← switch LAN / tunnel here
├── package.json               # root: concurrently dev script
├── client/                    # React + Vite frontend
│   ├── vite.config.js         # reads network.config.json, injects server URL
│   └── src/
│       ├── pages/             # Home.jsx, Room.jsx
│       ├── components/        # MusicPlayer, Controls, Queue, AddSong,
│       │                      #   Chat, UserList, VoteSkip
│       ├── context/           # RoomContext.jsx (shared state)
│       └── socket.js          # Socket.io client singleton
└── server/                    # Node.js backend
    ├── server.js              # Express + Socket.io entry point
    └── src/
        ├── rooms.js           # In-memory room store
        ├── socketHandlers.js  # All socket event logic
        └── routes/upload.js   # Multer audio upload endpoint
```

## Scripts

| Command | Description |
|---|---|
| `npm run install:all` | Install all dependencies (root + server + client) |
| `npm run dev` | Start both server and client in development mode |
| `npm run build` | Build the client for production |
| `npm run start` | Run the production server |
