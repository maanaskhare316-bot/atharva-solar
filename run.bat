@echo off
title Atharva Enterprises - Solar Energy Portal
cd /d "%~dp0"
echo =========================================================
echo Starting Atharva Enterprises Solar Web Application...
echo A Class Electrical & PWD Contractor
echo =========================================================
echo.
echo Server running at: http://localhost:3000
echo Admin Portal at:   http://localhost:3000/#admin
echo Admin Login:       admin@atharvasolar.com / Atharva@2026
echo.
"C:\Users\Khare\AppData\Roaming\Antigravity\bin\agy-node.cmd" server\index.js
pause
