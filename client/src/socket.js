import { io } from 'socket.io-client'

// VITE_SERVER_URL is injected at build time from network.config.json via vite.config.js
// Fallback: same hostname as page, port 3001 (works when server & client co-located)
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  `http://${window.location.hostname}:3001`

export const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling']
})
