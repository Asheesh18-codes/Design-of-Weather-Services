#!/bin/bash

# Aviation Weather Services - Full Stack Startup Script
# This script starts all three services: Node.js backend, Python NLP backend, and frontend

echo "🚀 Starting Aviation Weather Services Full Stack..."
echo ""

# Ask user which frontend to use
echo "Choose frontend to start:"
echo "1. Next.js Frontend (Port 3000) - New UI"
echo "2. React Frontend (Port 5173) - Legacy UI"
read -p "Enter choice (1 or 2, default: 1): " frontend_choice

# Default to Next.js if no input
frontend_choice=${frontend_choice:-1}

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

# Start Frontend based on user choice
if [ "$frontend_choice" == "1" ]; then
    echo "⚛️ Starting Next.js Frontend on port 3000..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    FRONTEND_URL="http://localhost:3000"
    FRONTEND_NAME="Next.js"
else
    echo "⚛️ Starting React Frontend on port 5173..."
    cd frontend-react
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    FRONTEND_URL="http://localhost:5173"
    FRONTEND_NAME="React"
fi

echo ""
echo "✅ All services started successfully!"
echo "📊 ${FRONTEND_NAME} Frontend: ${FRONTEND_URL}"
echo "🔧 Node.js API: http://localhost:5000"  
echo "🤖 Python NLP API: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop all services"

# Trap Ctrl+C and cleanup
trap 'echo ""; echo "🛑 Stopping all services..."; kill $NODE_PID $PYTHON_PID $FRONTEND_PID 2>/dev/null; exit' INT

# Wait indefinitely
wait