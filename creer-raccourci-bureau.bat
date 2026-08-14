@echo off
rem ============================================================
rem  inerWeb Fluide - creation d'un raccourci sur le Bureau
rem  Double-cliquez UNE fois : un raccourci "inerWeb Fluide" apparait
rem  sur votre Bureau. Aucun droit administrateur, rien d'installe ;
rem  pour l'enlever, supprimez simplement le raccourci.
rem  IMPORTANT : ce fichier doit rester en ASCII pur (pas d'accents).
rem ============================================================
chcp 65001 >nul
cd /d "%~dp0"

if not exist "%~dp0lancer-inerweb.bat" (
    echo   [ERREUR] lancer-inerweb.bat est introuvable a cote de ce fichier.
    echo   Extrayez d'abord le ZIP en entier, puis relancez.
    pause
    exit /b 1
)

powershell -NoProfile -Command ^
  "$b=[Environment]::GetFolderPath('Desktop');" ^
  "$s=(New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $b 'inerWeb Fluide.lnk'));" ^
  "$s.TargetPath='%~dp0lancer-inerweb.bat';" ^
  "$s.WorkingDirectory='%~dp0';" ^
  "$s.Description='inerWeb Fluide - Tracabilite F-Gas';" ^
  "$s.Save()"

if errorlevel 1 (
    echo   [ERREUR] La creation du raccourci a echoue.
    pause
    exit /b 1
)

echo.
echo   Raccourci "inerWeb Fluide" cree sur votre Bureau.
echo   Vous pouvez desormais lancer le logiciel depuis le Bureau.
echo.
pause
