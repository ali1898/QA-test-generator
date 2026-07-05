@echo off
REM Windows launcher for QA Test Generator CLI
REM Usage: qa <command> [options]
node "%~dp0packages\cli\dist\index.js" %*
