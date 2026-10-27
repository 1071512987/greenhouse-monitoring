@echo off
title Huanong Zhikong Launcher
cd /d "%~dp0"

start "Huanong Zhikong Server" /min "%~dp0greenhouse-server.exe" -addr=127.0.0.1:8080 -frontend="%~dp0web"
ping 127.0.0.1 -n 3 >nul
start "" "http://127.0.0.1:8080/"
exit /b 0
