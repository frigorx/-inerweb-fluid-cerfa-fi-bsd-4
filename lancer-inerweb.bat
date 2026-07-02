@echo off
rem ============================================================
rem  inerWeb Fluide v8 - lanceur du Mode Local Lycee
rem  Double-cliquez sur ce fichier pour demarrer l'application.
rem ============================================================

rem Page de code UTF-8 pour afficher correctement les accents
chcp 65001 >nul
title inerWeb Fluide — Traçabilité F-Gas (serveur local)

rem Se placer dans le dossier de ce script (l'application est portable :
rem elle fonctionne depuis n'importe quel dossier, y compris une clé USB)
cd /d "%~dp0"

echo.
echo   ============================================
echo    inerWeb Fluide v8 — Traçabilité F-Gas
echo   ============================================
echo.

rem --- Vérifier que Node.js est installé ---
where node >nul 2>nul
if errorlevel 1 (
    echo   [ERREUR] Node.js n'est pas installé sur ce poste.
    echo.
    echo   inerWeb Fluide a besoin de Node.js pour fonctionner.
    echo   Téléchargez la version LTS ^(gratuite^) sur :
    echo.
    echo       https://nodejs.org/fr
    echo.
    echo   Installez-la puis relancez ce fichier.
    echo.
    pause
    exit /b 1
)

rem --- Créer les dossiers de données s'ils n'existent pas ---
if not exist "data"      mkdir "data"
if not exist "documents" mkdir "documents"
if not exist "backups"   mkdir "backups"

echo   Démarrage du serveur local...
echo   L'application va s'ouvrir dans votre navigateur :
echo   http://localhost:2011
echo.
echo   ┌──────────────────────────────────────────────┐
echo   │  Fermez cette fenêtre pour arrêter           │
echo   │  inerWeb Fluide.                             │
echo   └──────────────────────────────────────────────┘
echo.

rem --- Ouvrir le navigateur après 2 secondes (le temps que le serveur démarre) ---
start "" /min cmd /c "timeout /t 2 /nobreak >nul & start "" http://localhost:2011"

rem --- Démarrer le serveur (au premier plan : fermer la fenêtre = arrêter) ---
node "%~dp0server\serveur.js"

rem Si le serveur s'arrête avec une erreur, laisser le message visible
echo.
echo   Le serveur s'est arrêté.
pause
