@echo off
rem ============================================================
rem  inerWeb Fluide v8 - lanceur du Mode Local Lycee
rem  Double-cliquez sur ce fichier pour demarrer l'application.
rem  IMPORTANT : ce fichier doit rester en ASCII pur (pas d'accents)
rem  sinon cmd.exe casse l'analyse des blocs (voir historique).
rem ============================================================

rem Codepage UTF-8 : uniquement pour bien afficher les accents que le
rem serveur Node ecrit dans cette fenetre (le .bat lui-meme reste ASCII).
chcp 65001 >nul
title inerWeb Fluide - Tracabilite F-Gas (serveur local)

rem Se placer dans le dossier de ce script (application portable).
cd /d "%~dp0"

echo.
echo   ===========================================
echo    inerWeb Fluide v8 - Tracabilite F-Gas
echo   ===========================================
echo.

rem --- Choisir le moteur Node : celui EMBARQUE (paquet portable) en priorite, ---
rem --- sinon le Node installe sur le poste. Le paquet cle en main contient   ---
rem --- node\node.exe : rien a installer, double-clic sur un poste vierge.     ---
set "NODE_EXE="
if exist "%~dp0node\node.exe" (
    set "NODE_EXE=%~dp0node\node.exe"
) else (
    where node >nul 2>nul && set "NODE_EXE=node"
)
if not defined NODE_EXE (
    echo   [ERREUR] Node.js est introuvable sur ce poste.
    echo.
    echo   Utilisez le paquet portable inerWeb Fluide ^(il contient tout,
    echo   rien a installer^), ou installez Node.js LTS ^(gratuit^) sur
    echo   https://nodejs.org/fr puis relancez ce fichier.
    echo.
    pause
    exit /b 1
)

rem --- Creer les dossiers de donnees s'ils n'existent pas ---
if not exist "data"      mkdir "data"
if not exist "documents" mkdir "documents"
if not exist "backups"   mkdir "backups"

rem --- Premiere utilisation ---
rem Au tout premier lancement (aucun compte), l'application affiche
rem directement dans le navigateur un ecran " Creer le compte
rem administrateur ". Plus aucune saisie dans cette fenetre noire : on
rem demarre simplement le serveur, l'onboarding se fait a l'ecran.

echo   Demarrage du serveur local...
echo   L'application va s'ouvrir dans votre navigateur : http://localhost:2011
echo.
echo   Fermez cette fenetre pour arreter inerWeb Fluide.
echo.

rem --- Ouvrir le navigateur apres 2 secondes (le temps que le serveur demarre) ---
start "" /min cmd /c "timeout /t 2 /nobreak >nul & start "" http://localhost:2011"

rem --- Demarrer le serveur (au premier plan : fermer la fenetre = arreter) ---
"%NODE_EXE%" "%~dp0server\serveur.js"

echo.
echo   Le serveur s'est arrete.
pause
