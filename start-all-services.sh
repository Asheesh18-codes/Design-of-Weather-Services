#!/bin/bash

# Aviation Weather Services - Full Stack Startup Script
# This script starts all three services: Node.js backend, Python NLP backend, and React frontend

echo "🚀 Starting Aviation Weather Services Full Stack..."
echo ""

# Start Node.js Backend (Port 5000)
echo "📡 Starting Node.js Backend on port 5000..."
cd backend-node
npm start &
NODE_PID=$!
cd ..
sleep 3

# Start Python NLP Backend (Port 8000) 
echo "🐍 Starting Python NLP Backend on port 8000..."
cd backend-python-nlp
source ../.venv/bin/activate 2>/dev/null || source ../.venv/Scripts/activate 2>/dev/null
python app.py &
PYTHON_PID=$!
cd ..
sleep 3

# Start React Frontend (Port 5173)
echo "⚛️ Starting React Frontend on port 5173..."
cd frontend-react
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ All services started successfully!"
echo "📊 Frontend: http://localhost:5173"
echo "🔧 Node.js API: http://localhost:5000"  
echo "🤖 Python NLP API: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop all services"

# Trap Ctrl+C and cleanup
trap 'echo ""; echo "🛑 Stopping all services..."; kill $NODE_PID $PYTHON_PID $FRONTEND_PID 2>/dev/null; exit' INT

# Wait indefinitely
wait