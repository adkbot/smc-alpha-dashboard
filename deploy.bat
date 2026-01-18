@echo off
echo ========================================
echo   SMC PRO - DEPLOY AUTOMATICO
echo ========================================
echo.

echo [1/3] Fazendo build local...
call npm run build
if errorlevel 1 (
    echo ERRO no build! Verifique os erros acima.
    pause
    exit /b 1
)
echo ✅ Build OK!
echo.

echo [2/3] Verificando login no Netlify...
netlify status
if errorlevel 1 (
    echo Precisa fazer login primeiro...
    echo Abrindo navegador para login...
    netlify login
)
echo.

echo [3/3] Fazendo deploy para producao...
netlify deploy --prod --dir=dist
if errorlevel 1 (
    echo ERRO no deploy!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ✅ DEPLOY COMPLETO!
echo ========================================
echo.
echo Abrindo site no navegador...
netlify open:site

pause
