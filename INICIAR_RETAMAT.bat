@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instala Node.js 22 o superior y vuelve a abrir este archivo.
  pause
  exit /b 1
)
if not exist .env (
  copy .env.example .env >nul
  echo Configura tu usuario y clave de MySQL en .env. Guarda y cierra el editor.
  start /wait notepad .env
)
node -e "['express','mysql2','dotenv','pdfkit','nodemailer'].forEach(name=>require.resolve(name))" >nul 2>nul
if errorlevel 1 (
  call npm install --omit=dev
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo Enciende MySQL y abre http://127.0.0.1:3001
echo Conserva esta ventana abierta. Para detener RETAMAT pulsa Ctrl+C.
node servidor.js
pause
