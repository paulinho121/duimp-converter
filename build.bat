@echo off
title DUIMP Converter - Build
color 0A
echo.
echo  =====================================================
echo   DUIMP Converter - Build para Windows
echo  =====================================================
echo.

set BASEDIR=%~dp0
set DISTDIR=%BASEDIR%dist

REM ---------- Limpar dist anterior ----------
if exist "%DISTDIR%" (
  echo [LIMPAR] Removendo dist anterior...
  rmdir /s /q "%DISTDIR%"
)
mkdir "%DISTDIR%"

REM ---------- 1. Build do frontend ----------
echo.
echo [1/4] Construindo frontend React...
cd /d "%BASEDIR%frontend"
call npm install --silent
if %ERRORLEVEL% NEQ 0 ( echo ERRO: npm install frontend falhou. & pause & exit /b 1 )
call npm run build
if %ERRORLEVEL% NEQ 0 ( echo ERRO: vite build falhou. & pause & exit /b 1 )
echo       Frontend OK.

REM ---------- 2. Copiar build para backend/public ----------
echo.
echo [2/4] Copiando frontend para backend/public...
if exist "%BASEDIR%backend\public" rmdir /s /q "%BASEDIR%backend\public"
xcopy /s /i /q "%BASEDIR%frontend\dist" "%BASEDIR%backend\public"
if %ERRORLEVEL% NEQ 0 ( echo ERRO: xcopy falhou. & pause & exit /b 1 )
echo       Copia OK.

REM ---------- 3. Instalar deps backend + compilar exe ----------
echo.
echo [3/4] Compilando backend com pkg (pode demorar 2-3 minutos)...
cd /d "%BASEDIR%backend"
call npm install --silent
if %ERRORLEVEL% NEQ 0 ( echo ERRO: npm install backend falhou. & pause & exit /b 1 )
call npx pkg . --target node18-win-x64 --output "%DISTDIR%\duimp-converter.exe" --compress GZip
if %ERRORLEVEL% NEQ 0 ( echo ERRO: pkg falhou. & pause & exit /b 1 )
echo       Compilacao OK.

REM ---------- 4. Copiar public para dist (ao lado do exe) ----------
echo.
echo [4/4] Preparando arquivos para o instalador...
xcopy /s /i /q "%BASEDIR%backend\public" "%DISTDIR%\public"
if %ERRORLEVEL% NEQ 0 ( echo ERRO: xcopy public falhou. & pause & exit /b 1 )

REM ---------- Copiar icone se existir ----------
if exist "%BASEDIR%icon.ico" copy /y "%BASEDIR%icon.ico" "%DISTDIR%\icon.ico" >nul

echo.
echo  =====================================================
echo   Build concluido com sucesso!
echo.
echo   Arquivos gerados em: %DISTDIR%
echo   - duimp-converter.exe  (executavel principal)
echo   - public\              (frontend React)
echo.
echo   PROXIMO PASSO:
echo   Abra o "installer.iss" no Inno Setup e clique
echo   em Build > Compile para gerar o instalador.
echo.
echo   Download Inno Setup (gratis):
echo   https://jrsoftware.org/isdl.php
echo  =====================================================
echo.
pause
