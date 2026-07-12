const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.dirname(__filename);
const CONFIG = path.join(ROOT, 'network.config.json');
const cloudflared = path.join(ROOT, 'cloudflared.exe');

// Read port from config
let port = 3001;
try {
  const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf-8'));
  port = cfg.port || 3001;
} catch (e) {}

console.log(`Starting cloudflared tunnel to http://localhost:${port}...`);

const proc = spawn(cloudflared, ['tunnel', '--url', `http://localhost:${port}`], {
  stdio: 'pipe',
  cwd: ROOT
});

// Capture and log the tunnel URL
proc.stderr.on('data', (data) => {
  const line = data.toString();
  process.stderr.write(line);
  
  // Extract and save tunnel URL
  const match = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (match) {
    const tunnelUrl = match[0];
    console.log(`\n🎵 Tunnel URL: ${tunnelUrl}\n`);
    
    // Update config file
    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf-8'));
      cfg.tunnelUrl = tunnelUrl;
      fs.writeFileSync(CONFIG, JSON.stringify(cfg, null, 2));
      console.log('✅ Updated network.config.json with tunnel URL');
    } catch (e) {
      console.error('Failed to update config:', e.message);
    }
  }
});

proc.stdout.on('data', (data) => {
  process.stdout.write(data);
});

proc.on('error', (err) => {
  console.error('Failed to start cloudflared:', err);
  process.exit(1);
});

proc.on('close', (code) => {
  console.log(`cloudflared exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  proc.kill('SIGINT');
});
process.on('SIGTERM', () => {
  proc.kill('SIGTERM');
});
