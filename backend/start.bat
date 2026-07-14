@echo off
echo.
echo  ██████╗ ██╗███████╗██╗  ██╗    ██████╗ ██╗      █████╗ ████████╗███████╗
echo  ██╔══██╗██║██╔════╝██║ ██╔╝    ██╔══██╗██║     ██╔══██╗╚══██╔══╝██╔════╝
echo  ██████╔╝██║███████╗█████╔╝     ██████╔╝██║     ███████║   ██║   █████╗  
echo  ██╔══██╗██║╚════██║██╔═██╗     ██╔═══╝ ██║     ██╔══██║   ██║   ██╔══╝  
echo  ██║  ██║██║███████║██║  ██╗    ██║     ███████╗██║  ██║   ██║   ██║     
echo  ╚═╝  ╚═╝╚═╝╚══════╝╚═╝  ╚═╝    ╚═╝     ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝     
echo.
echo  Multi-Asset Risk Intelligence Platform - Backend
echo  API Docs: http://localhost:8000/docs
echo  Health:   http://localhost:8000/api/health
echo.
cd /d "%~dp0"
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
