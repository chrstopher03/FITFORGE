@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando dependencias...
  npm install
)
node server.mjs
pause
