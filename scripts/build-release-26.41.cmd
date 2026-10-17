@echo off
rem Nova_A 26.41 Windows release build: WASM + editor/player web build, Tauri bundles, then packaging.
rem Never commits, stages or tags: the release is built from the working tree.
rem Double-click or run from the repository root. Output is mirrored to .cache\build-26.41.log.
setlocal
cd /d "%~dp0.."
if not exist .cache mkdir .cache
set LOG=.cache\build-26.41.log
echo Nova_A 26.41 build started %DATE% %TIME% > "%LOG%"
call :step "pnpm build" pnpm build || goto :failed
call :step "pnpm tauri build" pnpm tauri build || goto :failed
call :step "package release" powershell -NoProfile -ExecutionPolicy Bypass -File scripts\package-release-26.41.ps1 || goto :failed
echo BUILD-26.41-SUCCEEDED %DATE% %TIME% >> "%LOG%"
echo.
echo Nova_A 26.41 release is in releases\v26.41
goto :end
:step
echo ==== %~1 ==== >> "%LOG%"
echo ==== %~1 ====
shift
call %1 %2 %3 %4 %5 %6 %7 %8 %9 >> "%LOG%" 2>&1
exit /b %ERRORLEVEL%
:failed
echo BUILD-26.41-FAILED %DATE% %TIME% >> "%LOG%"
echo Build failed - see %LOG%
:end
endlocal
pause
