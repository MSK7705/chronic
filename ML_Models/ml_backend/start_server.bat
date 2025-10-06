@echo off
echo 🧠 Chronic Disease ML Backend Server
echo =====================================
echo.
echo Installing dependencies...
python -m pip install -r requirements.txt
echo.
echo Testing model loading...
python model_loader.py
echo.
echo Starting API server...
python main.py