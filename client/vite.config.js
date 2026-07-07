import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { networkInterfaces } from 'node:os'

const _dirname = dirname(fileURLToPath(import.meta.url))

function getLanIp() {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address
    }
  }
  return 'localhost'
}

let networkConfig = { mode: 'lan', port: 3001, tunnelUrl: '' }
try {
  networkConfig = JSON.parse(readFileSync(resolve(_dirname, '../network.config.json'), 'utf-8'))
} catch {
  // fallback defaults used above
}

const serverUrl =
  networkConfig.mode === 'tunnel' && networkConfig.tunnelUrl
    ? networkConfig.tunnelUrl
    : `http://${getLanIp()}:${networkConfig.port || 3001}`

export default defineConfig({
  plugins: [react()],
  define: {
    // Injected at build/dev time from network.config.json — no manual .env editing needed
    'import.meta.env.VITE_SERVER_URL': JSON.stringify(serverUrl)
  },
  server: {
    host: true  // expose Vite dev server on LAN as well
  }
})
