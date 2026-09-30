@echo off
cd /d "%~dp0"
echo === SNAKE ARCADE ===
where docker >nul 2>nul
if %errorlevel%==0 (
  echo Dang chay bang Docker...
  docker compose up -d --build
) else (
  where node >nul 2>nul
  if errorlevel 1 (
    echo Can cai Docker Desktop hoac Node.js LTS ^(https://nodejs.org^) roi chay lai file nay.
    pause
    exit /b 1
  )
  if not exist node_modules call npm install --omit=dev
  echo Dang chay bang Node.js ^(dong cua so den de tat game^)...
  start "Snake Arcade" cmd /k node server.js
)
call "%~dp0show-ip-windows.bat"
