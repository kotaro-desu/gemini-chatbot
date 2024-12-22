@echo off

cd /d /Your_path/src
start cmd /k uvicorn llm:app --reload --port 8000

cd /d /Your_path
start cmd /k npm start --port 3000

exit
