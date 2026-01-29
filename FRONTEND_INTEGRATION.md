# Frontend Integration Setup - Complete

## ✅ Completed Configuration

### 1. Environment Variables (.env.local)
Created `.env.local` with Next.js environment variables:
- `NEXT_PUBLIC_NODE_API_BASE=http://localhost:5000/api`
- `NEXT_PUBLIC_PYTHON_NLP_BASE=http://localhost:8000`
- Mapbox and other configuration variables

### 2. API Integration Files Updated

**lib/api.ts**
- Updated to use Next.js environment variables (`process.env.NEXT_PUBLIC_*`)
- Connects to Node.js backend on port 5000
- Includes:
  - Weather API (METAR, TAF, SIGMET)
  - Flight Plan API (waypoints, route analysis)
  - NOTAM API
  - Airport search and validation

**lib/nlpApi.ts**
- Updated to use Next.js environment variables
- Connects to Python NLP service on port 8000
- Includes:
  - NOTAM parsing
  - Weather summarization
  - Health checks

### 3. Backend Services Configuration

**Backend Node.js (backend-node/server.js)**
- Running on port 5000
- CORS configured to accept requests from:
  - http://localhost:3000 (Next.js)
  - http://localhost:5173 (Vite/React)
  
**Python NLP Service (backend-python-nlp/app.py)**
- Running on port 8000
- CORS configured for both frontends

### 4. Startup Scripts Updated

**start-all-services.ps1 (Windows)**
- Now prompts user to choose between Next.js or React frontend
- Default: Next.js (option 1)
- Starts all three services in separate windows

**start-all-services.sh (Linux/Mac)**
- Same interactive frontend selection
- Manages all service processes

### 5. Documentation

**frontend/README.md**
- Complete setup instructions
- API integration documentation
- Project structure overview
- How to run and deploy

## 🚀 How to Use

### Quick Start

1. **Install Dependencies** (if not done):
   ```bash
   cd frontend
   npm install
   ```

2. **Start All Services**:
   
   **Windows:**
   ```powershell
   .\start-all-services.ps1
   ```
   
   **Linux/Mac:**
   ```bash
   ./start-all-services.sh
   ```
   
   When prompted, choose:
   - `1` for Next.js Frontend (recommended)
   - `2` for React Frontend (legacy)

3. **Access the Application**:
   - Next.js Frontend: http://localhost:3000
   - Node.js API: http://localhost:5000
   - Python NLP API: http://localhost:8000

### Manual Start (Development)

If you want to start services individually:

```bash
# Terminal 1 - Node.js Backend
cd backend-node
npm start

# Terminal 2 - Python NLP Service
cd backend-python-nlp
python app.py

# Terminal 3 - Next.js Frontend
cd frontend
npm run dev
```

## 📡 API Endpoints Available

### Node.js Backend (port 5000)
- `GET /api/weather/current/:icao` - Get current METAR
- `GET /api/weather/forecast/:icao` - Get TAF forecast
- `POST /api/flightplan` - Generate waypoints
- `POST /api/flightplan/analyze` - Analyze route
- `GET /api/notam/:icao` - Get NOTAMs
- `GET /api/airports/search` - Search airports

### Python NLP Service (port 8000)
- `POST /nlp/parse-notam` - Parse NOTAM text
- `POST /nlp/summarize` - Generate weather summary
- `GET /` - Health check

## 🔗 Service Communication Flow

```
Next.js Frontend (Port 3000)
    ↓
    ├─→ Node.js Backend (Port 5000)
    │   └─→ External Aviation APIs
    │
    └─→ Python NLP Service (Port 8000)
        └─→ HuggingFace Models
```

## ✨ Features

- **Dual Frontend Support**: Choose between Next.js or React
- **Environment-based Configuration**: Easy to switch between dev/prod
- **CORS Enabled**: Proper cross-origin setup
- **Error Handling**: Graceful fallbacks in API clients
- **Type Safety**: TypeScript definitions for all APIs
- **Unified Startup**: One command to start everything

## 📝 Notes

- The Next.js frontend uses the same API structure as the React frontend
- All API calls are configured with proper timeouts and error handling
- Environment variables are properly namespaced with `NEXT_PUBLIC_` for client-side access
- Backend services support both frontends simultaneously
