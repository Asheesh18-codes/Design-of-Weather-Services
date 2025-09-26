#!/bin/bash

# Aviation Weather Briefing System - Startup Script (Linux/macOS)
# Starts all three services in the correct order with proper environment setup

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}🛫 Aviation Weather Briefing System${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo -e "Please install Node.js from https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"

# Check Python
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo -e "${RED}❌ Python is not installed${NC}"
    echo -e "Please install Python from https://python.org/"
    exit 1
fi

PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
fi
echo -e "${GREEN}✅ Python: $($PYTHON_CMD --version)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    echo -e "npm should come with Node.js installation"
    exit 1
fi
echo -e "${GREEN}✅ npm: $(npm --version)${NC}"

echo ""

# Setup environment files
echo -e "${YELLOW}🔧 Setting up environment configuration...${NC}"

# Node.js backend .env
if [[ ! -f "$PROJECT_ROOT/backend-node/.env" ]]; then
    echo -e "${BLUE}📝 Creating backend-node/.env${NC}"
    cat > "$PROJECT_ROOT/backend-node/.env" << EOF
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
PYTHON_NLP_URL=http://localhost:8000
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
fi

# Python NLP service .env
if [[ ! -f "$PROJECT_ROOT/backend-python-nlp/.env" ]]; then
    echo -e "${BLUE}📝 Creating backend-python-nlp/.env${NC}"
    cat > "$PROJECT_ROOT/backend-python-nlp/.env" << EOF
PORT=8000
ENV=development
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
HF_TOKEN=your_huggingface_token_here
HF_MODEL=sshleifer/distilbart-cnn-12-6
MAX_SUMMARY_LENGTH=200
MIN_SUMMARY_LENGTH=50
LOG_LEVEL=info
MAX_WORKERS=4
TIMEOUT_SECONDS=30
EOF
fi

# React frontend .env
if [[ ! -f "$PROJECT_ROOT/frontend-react/.env" ]]; then
    echo -e "${BLUE}📝 Creating frontend-react/.env${NC}"
    cat > "$PROJECT_ROOT/frontend-react/.env" << EOF
VITE_NODE_API_BASE=http://localhost:5000/api
VITE_PYTHON_NLP_BASE=http://localhost:8000
VITE_API_BASE=http://localhost:5000/api
VITE_MAPBOX_KEY=pk.eyJ1IjoiZGV2YW5zaGpoYWEiLCJhIjoiY21lcGhzMHJkMW9rejJscHQ0ajdkY3hldiJ9.pw9MWbZoSOPzOJbqr4kMhg
VITE_MAP_STYLE=mapbox://styles/mapbox/streets-v11
VITE_DEFAULT_MAP_CENTER_LAT=39.8283
VITE_DEFAULT_MAP_CENTER_LNG=-98.5795
VITE_DEFAULT_MAP_ZOOM=4
VITE_APP_TITLE=Aviation Weather Briefing
VITE_APP_VERSION=1.0.0
VITE_ENABLE_NLP_DIRECT=true
VITE_ENABLE_OFFLINE_MODE=true
VITE_ENABLE_DEBUG_LOGGING=true
VITE_DEV_MODE=true
VITE_MOCK_BACKEND=false
EOF
fi

echo -e "${GREEN}✅ Environment files configured${NC}"
echo ""

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"

# Node.js backend dependencies
echo -e "${BLUE}🟦 Installing Node.js backend dependencies...${NC}"
cd "$PROJECT_ROOT/backend-node"
if [[ ! -d "node_modules" ]]; then
    npm install
    if [[ $? -ne 0 ]]; then
        echo -e "${RED}❌ Failed to install Node.js backend dependencies${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Node.js backend dependencies already installed${NC}"
fi

# React frontend dependencies
echo -e "${BLUE}🟦 Installing React frontend dependencies...${NC}"
cd "$PROJECT_ROOT/frontend-react"
if [[ ! -d "node_modules" ]]; then
    npm install
    if [[ $? -ne 0 ]]; then
        echo -e "${RED}❌ Failed to install React frontend dependencies${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ React frontend dependencies already installed${NC}"
fi

# Python dependencies
echo -e "${BLUE}🐍 Installing Python dependencies...${NC}"
cd "$PROJECT_ROOT/backend-python-nlp"

# Create virtual environment if it doesn't exist
if [[ ! -d "venv" ]]; then
    echo -e "${BLUE}🐍 Creating Python virtual environment...${NC}"
    $PYTHON_CMD -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install Python packages
pip install fastapi uvicorn python-dotenv
if [[ $? -ne 0 ]]; then
    echo -e "${RED}❌ Failed to install Python dependencies${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All dependencies installed${NC}"
echo ""

# Function to cleanup background processes
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"
    
    if [[ ! -z $NODE_PID ]]; then
        kill $NODE_PID 2>/dev/null || true
        echo -e "${GREEN}✅ Node.js backend stopped${NC}"
    fi
    
    if [[ ! -z $PYTHON_PID ]]; then
        kill $PYTHON_PID 2>/dev/null || true
        echo -e "${GREEN}✅ Python NLP service stopped${NC}"
    fi
    
    if [[ ! -z $REACT_PID ]]; then
        kill $REACT_PID 2>/dev/null || true
        echo -e "${GREEN}✅ React frontend stopped${NC}"
    fi
    
    echo -e "${BLUE}👋 Aviation Weather Briefing System stopped${NC}"
    exit 0
}

# Set up signal handling
trap cleanup SIGINT SIGTERM

# Create log directory
mkdir -p "$PROJECT_ROOT/logs"

echo -e "${YELLOW}🚀 Starting all services...${NC}"
echo ""

# Start Node.js backend
echo -e "${GREEN}🟢 Starting Node.js Backend (Port 5000)...${NC}"
cd "$PROJECT_ROOT/backend-node"
node server.js > "$PROJECT_ROOT/logs/backend-node.log" 2>&1 &
NODE_PID=$!

# Wait a moment for the server to start
sleep 3

# Check if Node.js backend started successfully
if ! kill -0 $NODE_PID 2>/dev/null; then
    echo -e "${RED}❌ Failed to start Node.js backend${NC}"
    echo -e "Check logs at: $PROJECT_ROOT/logs/backend-node.log"
    exit 1
fi
echo -e "${GREEN}✅ Node.js backend running (PID: $NODE_PID)${NC}"

# Start Python NLP service
echo -e "${GREEN}🐍 Starting Python NLP Service (Port 8000)...${NC}"
cd "$PROJECT_ROOT/backend-python-nlp"
source venv/bin/activate
$PYTHON_CMD app.py > "$PROJECT_ROOT/logs/backend-python.log" 2>&1 &
PYTHON_PID=$!

# Wait a moment for the server to start
sleep 5

# Check if Python service started successfully
if ! kill -0 $PYTHON_PID 2>/dev/null; then
    echo -e "${RED}❌ Failed to start Python NLP service${NC}"
    echo -e "Check logs at: $PROJECT_ROOT/logs/backend-python.log"
    cleanup
    exit 1
fi
echo -e "${GREEN}✅ Python NLP service running (PID: $PYTHON_PID)${NC}"

# Start React frontend
echo -e "${GREEN}⚛️  Starting React Frontend (Port 3000/5173)...${NC}"
cd "$PROJECT_ROOT/frontend-react"
npm run dev > "$PROJECT_ROOT/logs/frontend-react.log" 2>&1 &
REACT_PID=$!

# Wait a moment for the server to start
sleep 5

# Check if React frontend started successfully
if ! kill -0 $REACT_PID 2>/dev/null; then
    echo -e "${RED}❌ Failed to start React frontend${NC}"
    echo -e "Check logs at: $PROJECT_ROOT/logs/frontend-react.log"
    cleanup
    exit 1
fi
echo -e "${GREEN}✅ React frontend running (PID: $REACT_PID)${NC}"

echo ""
echo -e "${PURPLE}🎉 Aviation Weather Briefing System is running!${NC}"
echo -e "${PURPLE}=============================================${NC}"
echo ""
echo -e "${GREEN}📡 Service URLs:${NC}"
echo -e "   Frontend:        ${BLUE}http://localhost:3000${NC} or ${BLUE}http://localhost:5173${NC}"
echo -e "   Node.js API:     ${BLUE}http://localhost:5000${NC}"
echo -e "   Python NLP API:  ${BLUE}http://localhost:8000${NC}"
echo ""
echo -e "${GREEN}📊 API Endpoints:${NC}"
echo -e "   Flight Planning: ${BLUE}http://localhost:5000/api/flightplan${NC}"
echo -e "   Weather Data:    ${BLUE}http://localhost:5000/api/weather${NC}"
echo -e "   NOTAM Processing: ${BLUE}http://localhost:5000/api/notam${NC}"
echo -e "   NLP Parsing:     ${BLUE}http://localhost:8000/nlp/parse-notam${NC}"
echo -e "   NLP Summary:     ${BLUE}http://localhost:8000/nlp/summarize${NC}"
echo ""
echo -e "${GREEN}📋 Log Files:${NC}"
echo -e "   Node.js Backend: ${BLUE}$PROJECT_ROOT/logs/backend-node.log${NC}"
echo -e "   Python NLP:      ${BLUE}$PROJECT_ROOT/logs/backend-python.log${NC}"
echo -e "   React Frontend:  ${BLUE}$PROJECT_ROOT/logs/frontend-react.log${NC}"
echo ""
echo -e "${YELLOW}⏳ Please wait 30-60 seconds for all services to fully initialize...${NC}"
echo ""
echo -e "${GREEN}🧪 Test the system:${NC}"
echo -e "   1. Open your browser to the frontend URL above"
echo -e "   2. Fill out the flight form (Origin: KJFK, Destination: KSFO)"
echo -e "   3. Click 'Get Flight Briefing' to see the full integration"
echo ""
echo -e "${RED}🛑 To stop all services: Press Ctrl+C${NC}"
echo ""

# Keep the script running and show live status
while true; do
    sleep 10
    
    # Check if all services are still running
    SERVICES_RUNNING=0
    
    if kill -0 $NODE_PID 2>/dev/null; then
        ((SERVICES_RUNNING++))
    else
        echo -e "${RED}⚠️  Node.js backend stopped unexpectedly${NC}"
    fi
    
    if kill -0 $PYTHON_PID 2>/dev/null; then
        ((SERVICES_RUNNING++))
    else
        echo -e "${RED}⚠️  Python NLP service stopped unexpectedly${NC}"
    fi
    
    if kill -0 $REACT_PID 2>/dev/null; then
        ((SERVICES_RUNNING++))
    else
        echo -e "${RED}⚠️  React frontend stopped unexpectedly${NC}"
    fi
    
    # If any service stopped, exit
    if [[ $SERVICES_RUNNING -lt 3 ]]; then
        echo -e "${RED}❌ One or more services stopped. Shutting down...${NC}"
        cleanup
        exit 1
    fi
done
