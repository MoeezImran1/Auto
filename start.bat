@echo off
echo =========================================
echo   Starting Email Auth Service
echo =========================================
echo.

echo Starting Backend Server on port 8000...
start cmd /k "cd backend && python -m uvicorn main:app --reload --port 8000"

echo Starting Frontend Server on port 3000...
start cmd /k "cd frontend && python -m http.server 3000"

echo.
echo Both services are starting up in separate windows!
echo You can access the UI at: http://localhost:3000
echo You can access the API Docs at: http://localhost:8000/docs
echo.
pause
