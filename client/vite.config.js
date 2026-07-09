import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const _dirname = dirname(fileURLToPath(import.meta.url))

let networkConfig = { mode: 'lan', port: 3001, tunnelUrl: '' }
try {
  networkConfig = JSON.parse(readFileSync(resolve(_dirname, '../network.config.json'), 'utf-8'))
} catch {
  // fallback defaults used above
}

// In LAN mode: don't bake a fixed IP — let the client derive the server host
// from window.location.hostname at runtime. This means ANY machine on the
// network can open the Vite URL and automatically hit the right backend.
// In tunnel mode: inject the full tunnel URL (different host entirely).
const isTunnel = networkConfig.mode === 'tunnel' && networkConfig.tunnelUrl
const port = networkConfig.port || 3001

export default defineConfig({
  plugins: [react()],
  define: isTunnel
    ? { 'import.meta.env.VITE_SERVER_URL': JSON.stringify(networkConfig.tunnelUrl) }
    : { 'import.meta.env.VITE_SERVER_PORT': JSON.stringify(String(port)) },
  server: {
    host: true,  // expose Vite dev server on LAN as well
    proxy: {
      // Forward /api and /uploads to the backend in dev (LAN) mode
      '/api':     { target: `http://localhost:${port}`, changeOrigin: true },
      '/uploads': { target: `http://localhost:${port}`, changeOrigin: true }
    }
  }
})
