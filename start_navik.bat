@echo off
echo ============================================
echo  NAVIK - Starting all services
echo ============================================

echo [1/2] Starting Ollama with correct model path...
set OLLAMA_MODELS=D:\ollama_models\models
taskkill /F /IM ollama.exe /T 2>nul
timeout /t 2 /nobreak >nul
start "" /B ollama serve
timeout /t 5 /nobreak >nul
echo Ollama started at http://localhost:11434

echo [2/2] Starting NAVIK dev server...
set PATH=C:\Users\kuchi\AppData\Local\nvm\v25.1.0;%PATH%
cd /d D:\TBP_F
npm run dev

pause
