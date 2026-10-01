@echo off
setlocal
set PORT=8080
set MAP=
where docker >nul 2>nul
if %errorlevel%==0 for /f "tokens=*" %%p in ('docker compose port app 8080 2^>nul') do set "MAP=%%p"
if defined MAP for %%z in (%MAP::= %) do set "PORT=%%z"
echo.
echo === DIA CHI DE VAO GAME (dien thoai / TV / may khac CUNG Wi-Fi) ===
if defined MAP (echo Docker published container port 8080 as: %MAP%) else (echo Chay bang Node: cong %PORT%)
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  for /f "tokens=* delims= " %%b in ("%%a") do echo    http://%%b:%PORT%
)
echo.
echo Chon dia chi dang 192.168.x.x hoac 10.x.x.x (bo qua 172.x cua Docker/WSL).
echo Neu khong vao duoc: khi Windows hoi Firewall, chon "Private networks".
echo.
pause
