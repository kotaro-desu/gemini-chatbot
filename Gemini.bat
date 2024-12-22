@echo off

cd /d C:\Users\SOL-Project\Gemini_Chatbot-main\src
start cmd /k uvicorn llm:app --reload --port 8000

cd /d C:\Users\SOL-Project\Gemini_Chatbot-main
start cmd /k npm start --port 3000

exit