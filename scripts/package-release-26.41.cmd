@echo off
rem Nova_A 26.41: repackage releases\v26.41 from the existing build outputs (no rebuild).
rem Use after scripts\build-release-26.41.cmd when only release documents changed. Log: .cache\package-26.41.log
setlocal
cd /d "%~dp0.."
if not exist .cache mkdir .cache
set LOG=.cache\package-26.41.log
echo Nova_A 26.41 packaging started %DATE% %TIME% > "%LOG%"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\package-release-26.41.ps1 >> "%LOG%" 2>&1 || goto :failed
echo PACKAGE-26.41-SUCCEEDED %DATE% %TIME% >> "%LOG%"
echo Nova_A 26.41 release is in releases\v26.41
goto :end
:failed
echo PACKAGE-26.41-FAILED %DATE% %TIME% >> "%LOG%"
echo Packaging failed - see %LOG%
:end
endlocal
pause
