@echo off
REM scripts/db-local.bat - Run commands against local PostgreSQL (Windows)

REM Load .env.local
for /f "usebackq tokens=1,2 delims==" %%a in (".env.local") do (
    set %%a=%%b
)

REM Run the command passed as arguments
cd ..
%*
