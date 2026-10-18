@echo off
setlocal
cd /d "%~dp0"
where bun >nul 2>nul
if not errorlevel 1 (
  bun run dev --open
) else if exist ".tooling\node_modules\.bin\bun.cmd" (
  call ".tooling\node_modules\.bin\bun.cmd" run dev --open
) else (
  echo Bun was not found. Install Bun, then run bun install and bun run dev.
  pause
)
