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

rem --- Charger la configuration locale simple (NOM=VALEUR, commentaires #). ---
if exist ".env" (
    for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env") do set "%%A=%%B"
)
if not defined PORT set "PORT=2011"
set "APP_URL=http://localhost:%PORT%"
if "%IWF_LAN%"=="1" set "APP_URL=https://%IWF_HOTE_LAN%:%PORT%"

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

rem --- Base vive HORS du dossier du programme et HORS OneDrive (P1-6). ---
rem Une valeur IWF_CHEMIN_BASE definie par l'administrateur (.env) prime.
rem CONTINUITE : une installation EXISTANTE (data\ deja a cote du programme)
rem garde sa base la ou elle est ; seule une installation NEUVE part dans
rem %LOCALAPPDATA% (hors cloud, hors dossier synchronise). Si la base
rem existante est sous OneDrive, le serveur REFUSE de demarrer et explique.
if not defined IWF_CHEMIN_BASE (
    if not exist "data\inerweb-fluide.db" (
        set "IWF_CHEMIN_BASE=%LOCALAPPDATA%\inerWeb-Fluide\data\inerweb-fluide.db"
    )
)

rem --- Premiere utilisation ---
rem Au tout premier lancement (aucun compte), l'application affiche
rem directement dans le navigateur un ecran " Creer le compte
rem administrateur ". Plus aucune saisie dans cette fenetre noire : on
rem demarre simplement le serveur, l'onboarding se fait a l'ecran.

echo   Demarrage du serveur local...
echo   L'application va s'ouvrir dans votre navigateur : %APP_URL%
if defined IWF_CHEMIN_BASE echo   Donnees locales : %IWF_CHEMIN_BASE%
echo.
echo   Fermez cette fenetre pour arreter inerWeb Fluide.
echo.

rem --- Ouvrir le navigateur apres 2 secondes (le temps que le serveur demarre) ---
start "" /min cmd /c "timeout /t 2 /nobreak >nul & start "" %APP_URL%"

rem --- Demarrer le serveur (au premier plan : fermer la fenetre = arreter) ---
"%NODE_EXE%" "%~dp0server\serveur.js"

echo.
echo   Le serveur s'est arrete.
pause
