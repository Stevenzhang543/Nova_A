@echo off
rem Nova_A 26.42: repackage releases\v26.42 from the existing build outputs (no rebuild).
rem Use after scripts\build-release-26.42.cmd when only release documents changed. Log: .cache\package-26.42.log
setlocal
cd /d "%~dp0.."
if not exist .cache mkdir .cache
set LOG=.cache\package-26.42.log
echo Nova_A 26.42 packaging started %DATE% %TIME% > "%LOG%"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\package-release-26.42.ps1 >> "%LOG%" 2>&1 || goto :failed
echo PACKAGE-26.42-SUCCEEDED %DATE% %TIME% >> "%LOG%"
echo Nova_A 26.42 release is in releases\v26.42
goto :end
:failed
echo PACKAGE-26.42-FAILED %DATE% %TIME% >> "%LOG%"
echo Packaging failed - see %LOG%
:end
endlocal
pause
