@echo off
setlocal
set PORT=8080
if exist "%~dp0.env" for /f "usebackq tokens=1,* delims==" %%a in ("%~dp0.env") do if /i "%%a"=="HOST_PORT" set PORT=%%b
echo.
echo === DIA CHI DE VAO GAME (dien thoai / TV / may khac CUNG Wi-Fi) ===
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  for /f "tokens=* delims= " %%b in ("%%a") do echo    http://%%b:%PORT%
)
echo.
echo Chon dia chi dang 192.168.x.x hoac 10.x.x.x (bo qua 172.x cua Docker/WSL).
echo Neu khong vao duoc: khi Windows hoi Firewall, chon "Private networks".
echo.
pause
