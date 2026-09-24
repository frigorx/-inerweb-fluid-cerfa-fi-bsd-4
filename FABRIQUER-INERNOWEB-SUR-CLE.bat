@echo off
rem ============================================================
rem  inerNoWeb - fabrication DIRECTE sur une cle USB
rem  Double-cliquez sur ce fichier, donnez la lettre de la cle.
rem  IMPORTANT : ce fichier doit rester en ASCII pur (pas d accents)
rem  sinon cmd.exe casse l analyse des blocs (voir lancer-inerweb.bat).
rem ============================================================

chcp 65001 >nul
title inerNoWeb - fabrication sur cle USB
cd /d "%~dp0"

echo.
echo   ========================================================
echo     inerNoWeb - la copie hors ligne, ecrite sur votre cle
echo   ========================================================
echo.
echo   Contenu : le site, les narrations, Firefox et 7-Zip.
echo   Prevoir environ 800 Mo de libre, et 10 a 20 minutes.
echo.

rem Le fabricant doit etre a cote de ce fichier.
if not exist "%~dp0outils\fabriquer-inernoweb.mjs" (
  echo   Ce fichier doit rester dans le dossier du depot inerWeb.
  echo   Il n y trouve pas le fabricant : outils\fabriquer-inernoweb.mjs
  echo.
  pause
  exit /b 1
)

rem Node est indispensable : le dire AVANT de faire patienter.
where node >nul 2>&1
if errorlevel 1 (
  echo   Node.js est introuvable sur ce PC.
  echo   Installez Node 22 ou plus recent depuis nodejs.org,
  echo   puis relancez ce fichier.
  echo.
  pause
  exit /b 1
)

echo   Lecteurs actuellement branches :
for %%D in (D E F G H I J K L M) do if exist %%D:\ echo       %%D:
echo.

set "LETTRE="
set /p "LETTRE=  Lettre de la cle USB, par exemple E, puis Entree : "
if not defined LETTRE goto :sansreponse
set "LETTRE=%LETTRE:~0,1%"

if not exist %LETTRE%:\ (
  echo.
  echo   Le lecteur %LETTRE%: n existe pas. La cle est-elle branchee ?
  echo.
  pause
  exit /b 1
)

echo.
echo   Destination : %LETTRE%:\inerNoWeb
echo   Un dossier inerNoWeb deja present y sera refait a neuf.
echo   Le reste de la cle n est pas touche.
echo.
pause
echo.

node "outils\fabriquer-inernoweb.mjs" --voix --navigateur --dezippeur --sortie "%LETTRE%:\inerNoWeb"
set "CODE=%errorlevel%"

echo.
if "%CODE%"=="0" (
  echo   Termine. Sur la cle, ouvrez le dossier inerNoWeb.
  echo   Sur chaque PC du lycee, lisez EST-CE-QUE-CA-MARCHE.html
  echo   avant la seance : il dit si ce poste sait lire le kit.
) else (
  echo   La fabrication s est terminee avec au moins un manque.
  echo   Relisez les lignes ci-dessus : elles disent lequel.
)
echo.
pause
exit /b %CODE%

:sansreponse
echo.
echo   Aucune lettre donnee. Rien n a ete fait.
echo.
pause
exit /b 1
