@echo off
rem Nova_A: repackage releases\v<label> from the existing build outputs (no rebuild), for example after only
rem the release documents or the evidence changed. Log: .cache\package-<label>.log
setlocal
cd /d "%~dp0.."
for /f "usebackq delims=" %%v in (`node -p "require('./package.json').version.replace(/\.0$/, '')"`) do set LABEL=%%v
if not exist .cache mkdir .cache
set LOG=.cache\package-%LABEL%.log
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\package-release.ps1 -Label %LABEL% > "%LOG%" 2>&1 && (echo PACKAGE-%LABEL%-SUCCEEDED >> "%LOG%" & echo Nova_A %LABEL% release is in releases\v%LABEL%) || (echo PACKAGE-%LABEL%-FAILED >> "%LOG%" & echo Packaging failed - see %LOG%)
endlocal
