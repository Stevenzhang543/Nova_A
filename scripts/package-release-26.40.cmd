@echo off
rem Nova_A 26.40: repackage releases\v26.40 from the existing build outputs (no rebuild).
rem Use after scripts\build-release-26.40.cmd when only release documents changed. Log: .cache\package-26.40.log
setlocal
cd /d "%~dp0.."
if not exist .cache mkdir .cache
set LOG=.cache\package-26.40.log
echo Nova_A 26.40 packaging started %DATE% %TIME% > "%LOG%"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\package-release-26.40.ps1 >> "%LOG%" 2>&1 || goto :failed
echo PACKAGE-26.40-SUCCEEDED %DATE% %TIME% >> "%LOG%"
echo Nova_A 26.40 release is in releases\v26.40
goto :end
:failed
echo PACKAGE-26.40-FAILED %DATE% %TIME% >> "%LOG%"
echo Packaging failed - see %LOG%
:end
endlocal
pause
