@echo off
cd /d "%~dp0"
cloudflared.exe tunnel --url http://localhost:3001
