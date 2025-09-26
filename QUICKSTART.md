# Aviation Weather Briefing System - Quick Start

## 🚀 Complete Integration Setup

This system provides a comprehensive aviation weather briefing with:
- **Node.js Backend** - Flight planning, weather decoding, NOTAM processing
- **Python NLP Service** - AI-powered NOTAM parsing and summarization  
- **React Frontend** - Interactive map, weather displays, briefing interface

## 🔧 Quick Start (Windows)

### Option 1: Automated Setup
Run the automated setup script:
```bash
start-system.bat
```
This will:
- Install all dependencies
- Set up environment variables  
- Start all 3 services automatically
- Open browser to http://localhost:3000

### Option 2: Manual Setup

#### Prerequisites
- Node.js 16+ 
- Python 3.8+
- Git

#### 1. Install Dependencies
```bash
# Node.js Backend
cd backend-node
npm install

# React Frontend  
cd ../frontend-react
npm install

# Python NLP Service
cd ../backend-python-nlp
pip install -r requirements.txt
```

#### 2. Configure Environment
Create `.env` files in each directory:

**backend-node/.env:**
```env
PORT=5000
PYTHON_NLP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

**backend-python-nlp/.env:**
```env
PORT=8000
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

**frontend-react/.env:**
```env
VITE_NODE_API_BASE=http://localhost:5000/api
VITE_PYTHON_NLP_BASE=http://localhost:8000
VITE_MAPBOX_KEY=your_mapbox_token_here
```

#### 3. Start Services
```bash
# Terminal 1 - Node.js Backend
cd backend-node
npm run dev

# Terminal 2 - Python NLP Service
cd backend-python-nlp  
python app.py

# Terminal 3 - React Frontend
cd frontend-react
npm run dev
```

#### 4. Open Application
Visit: http://localhost:3000

## 🧪 Test the Integration

### 1. Fill Flight Form
- Origin: `KJFK`  
- Destination: `KSFO`
- Altitude: `35000`
- Aircraft: `B737`

### 2. Generate Briefing
Click "Get Flight Briefing" to see:
- Interactive route map
- Weather conditions at waypoints
- NOTAM analysis with AI summaries
- Hazard overlays (SIGMETs)

### 3. Interact with Components
- Click weather stations on map for details
- Expand NOTAMs for AI parsing
- View comprehensive flight summary

## 🔗 API Endpoints

### Node.js Backend (Port 5000)
- `POST /api/flightplan` - Generate waypoints
- `POST /api/weather/metar` - Decode weather  
- `POST /api/notam/summarize` - Get AI summary

### Python NLP Service (Port 8000)
- `POST /nlp/parse-notam` - Parse NOTAM text
- `POST /nlp/summarize` - Generate summaries
- `GET /` - Health check

## 📖 Documentation

- **Complete Integration Guide:** `INTEGRATION_GUIDE.md`
- **API Documentation:** See individual service READMEs
- **Workflow Examples:** Check integration guide for detailed request/response examples

## 🐛 Troubleshooting

### Common Issues
1. **Port conflicts**: Ensure ports 3000, 5000, 8000 are available
2. **CORS errors**: Check environment variable configuration  
3. **Missing MapBox key**: Update `VITE_MAPBOX_KEY` in frontend .env
4. **Python dependencies**: Ensure all packages in requirements.txt are installed

### Health Checks
- Node.js: http://localhost:5000
- Python NLP: http://localhost:8000  
- React: http://localhost:3000

## ✨ Features

### ✅ Complete Integration Features
- [x] Flight route planning with waypoints
- [x] Real-time weather decoding (METAR/TAF)
- [x] AI-powered NOTAM parsing and summarization
- [x] Interactive map with weather overlays
- [x] SIGMET hazard visualization  
- [x] Comprehensive flight briefing generation
- [x] Cross-service API communication
- [x] Error handling and fallbacks
- [x] Responsive UI with detailed popups

### 🔄 Data Flow
```
Pilot Input → Node.js → Weather/NOTAM APIs
                ↓
              Python NLP ← Process NOTAMs
                ↓
            React Frontend ← Display Results
```

## 🚀 Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  React Frontend │    │  Node.js Backend │    │ Python NLP API  │
│   (Port 3000)   │◄──►│   (Port 5000)    │◄──►│  (Port 8000)    │
│                 │    │                  │    │                 │
│ • FlightForm    │    │ • Flight Planning│    │ • NOTAM Parsing │
│ • MapView       │    │ • Weather APIs   │    │ • AI Summary    │
│ • NotamPanel    │    │ • NOTAM Routing  │    │ • HuggingFace   │
│ • WeatherPopup  │    │ • CORS Handling  │    │ • Fallbacks     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

Start with `start-system.bat` and explore the complete aviation weather briefing system!