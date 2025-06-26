@echo off
REM PoD Protocol CLI Launcher
REM Usage: pod [command] [args...]
REM If no arguments provided, launches interactive mode

IF "%~1"=="" (
    echo 🚀 Launching PoD Protocol Interactive CLI...
    echo.
    node cli/dist/index.js
) ELSE (
    node cli/dist/index.js %*
) 