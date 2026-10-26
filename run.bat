@echo off
title Smart Electricity Bill & Energy Waste Analyzer
echo ========================================================
echo  Starting VoltWise - Smart Electricity & Energy Analyzer
echo ========================================================
echo.
python -m pip install -r requirements.txt
echo.
echo Launching Web Server on http://127.0.0.1:5000 ...
echo Press Ctrl+C in this window to stop the server.
echo.
python app.py
pause
