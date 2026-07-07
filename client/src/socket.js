import { io } from 'socket.io-client'

// Tunnel mode: VITE_SERVER_URL is injected (e.g. https://abc.trycloudflare.com)
// LAN mode:    no URL injected — derive from page hostname + server port at runtime
//              e.g. opening http://172.21.32.1:5173 → connects to 172.21.32.1:3001
//              opening http://localhost:5173        → connects to localhost:3001
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  `${window.location.protocol}//${window.location.hostname}:${import.meta.env.VITE_SERVER_PORT || '3001'}`

export const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling']
})
