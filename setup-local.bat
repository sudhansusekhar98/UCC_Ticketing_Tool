@echo off
REM Setup script for local development environment

echo ========================================
echo UCC Ticketing Tool - Local Setup
echo ========================================
echo.

REM Check if .env already exists
if exist "frontend\ucc-ticketing\.env" (
    echo .env file already exists!
    echo.
    set /p OVERWRITE="Do you want to overwrite it? (y/n): "
    if /i not "%OVERWRITE%"=="y" (
        echo Setup cancelled.
        pause
        exit /b
    )
)

REM Create .env file
echo Creating .env file for local development...
(
echo # Local Development Environment
echo VITE_API_URL=http://localhost:5000/api
) > "frontend\ucc-ticketing\.env"

echo.
echo ✓ .env file created successfully!
echo.
echo Configuration:
echo   VITE_API_URL=http://localhost:5000/api
echo.
echo Next steps:
echo   1. Make sure your backend is running on port 5000
echo   2. Run 'npm run dev' in frontend/ucc-ticketing
echo   3. Open http://localhost:5173 in your browser
echo.
pause
