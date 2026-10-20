@echo off
rem Nova_A 26.43: repackage releases\v26.43 from the existing build outputs (no rebuild).
rem Use after scripts\build-release-26.43.cmd when only release documents changed. Log: .cache\package-26.43.log
setlocal
cd /d "%~dp0.."
if not exist .cache mkdir .cache
set LOG=.cache\package-26.43.log
echo Nova_A 26.43 packaging started %DATE% %TIME% > "%LOG%"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\package-release-26.43.ps1 >> "%LOG%" 2>&1 || goto :failed
echo PACKAGE-26.43-SUCCEEDED %DATE% %TIME% >> "%LOG%"
echo Nova_A 26.43 release is in releases\v26.43
goto :end
:failed
echo PACKAGE-26.43-FAILED %DATE% %TIME% >> "%LOG%"
echo Packaging failed - see %LOG%
:end
endlocal
pause
