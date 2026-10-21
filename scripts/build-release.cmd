@echo off
rem Nova_A Windows release build without the checks: WASM + editor/player web build, Tauri bundles, packaging.
rem Use scripts\release.cmd for a real release (it runs every check first). Never commits, stages or tags.
setlocal
cd /d "%~dp0.."
for /f "usebackq delims=" %%v in (`node -p "require('./package.json').version.replace(/\.0$/, '')"`) do set LABEL=%%v
if not exist .cache mkdir .cache
set LOG=.cache\build-%LABEL%.log
echo Nova_A %LABEL% build started %DATE% %TIME% > "%LOG%"
call pnpm build >> "%LOG%" 2>&1 || goto :failed
call pnpm tauri build >> "%LOG%" 2>&1 || goto :failed
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\package-release.ps1 -Label %LABEL% >> "%LOG%" 2>&1 || goto :failed
echo BUILD-%LABEL%-SUCCEEDED %DATE% %TIME% >> "%LOG%"
echo Nova_A %LABEL% release is in releases\v%LABEL%
goto :end
:failed
echo BUILD-%LABEL%-FAILED %DATE% %TIME% >> "%LOG%"
echo Build failed - see %LOG%
:end
endlocal
