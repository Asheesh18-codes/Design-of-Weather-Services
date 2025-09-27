# Aviation Weather Briefing - Complete Integration Documentation

## Overview

This documentation describes the complete integration workflow for the Aviation Weather Briefing system, connecting Node.js backend, Python NLP service, and React frontend to provide comprehensive flight briefings.

## System Architecture

```
Frontend (React + Vite)
    ↓ HTTP requests
Node.js Backend (Express)
    ↓ Forward NOTAMs
Python NLP Service (FastAPI)
```

## Backend Services

### Node.js Backend (Port 5000)

**Base URL:** `http://localhost:5000`

#### Endpoints

##### Flight Plan Endpoints
- `POST /api/flightplan` - Generate flight waypoints
- `POST /api/flightplan/analyze` - Analyze route with weather

##### Weather Endpoints
- `POST /api/weather/metar` - Decode METAR data
- `POST /api/weather/taf` - Decode TAF data
- `POST /api/weather/route` - Get weather along route
- `POST /api/weather/sigmet` - Get SIGMET data

##### NOTAM Endpoints
- `GET /api/notam/:icao` - Get NOTAMs for airport
- `POST /api/notam/parse-single` - Parse single NOTAM via Python NLP
- `POST /api/notam/summarize` - Summarize NOTAMs/Weather via Python NLP
- `POST /api/notam/route-critical` - Get route-critical NOTAMs

### Python NLP Service (Port 8000)

**Base URL:** `http://localhost:8000`

#### Endpoints
- `POST /nlp/parse-notam` - Parse NOTAM text into structured JSON
- `POST /nlp/summarize` - Summarize NOTAM/weather data into plain text
- `GET /` - Health check

## Frontend Components

### Core Components

#### FlightForm.jsx
Enhanced flight planning form with:
- Origin/Destination ICAO codes
- Cruise altitude selection
- Aircraft type selection
- Departure time planning
- Optional pilot METAR input

#### MapView.jsx
Interactive map displaying:
- Flight route with waypoints
- Weather stations (clickable)
- SIGMET overlays
- Weather popup integration

#### WeatherPopup.jsx
Detailed weather information display:
- Decoded METAR/TAF data
- Human-readable conditions
- Severity indicators
- Raw weather text

#### SigmetOverlay.jsx
SIGMET hazard visualization:
- Color-coded hazard polygons
- Hazard type and intensity
- Interactive legend
- Clickable hazard areas

#### NotamPanel.jsx
NOTAM management and analysis:
- NOTAM listing with filters
- AI-powered parsing
- Summary generation
- Category and severity indicators

### API Services

#### services/api.js
Main API service for Node.js backend:
```javascript
import { flightPlanAPI, weatherAPI, notamAPI, briefingAPI } from './api';

// Generate complete flight briefing
const briefing = await briefingAPI.getFlightBriefing({
  origin: 'KJFK',
  destination: 'KSFO',
  altitude: 35000,
  departureTime: '2024-01-15T10:00:00'
});
```

#### services/nlpApi.js
Direct Python NLP service integration:
```javascript
import nlpAPI from './nlpApi';

// Parse NOTAM directly
const parsed = await nlpAPI.parseNotamDirect({
  notam_text: 'A1234/23 KJFK RWY 04L/22R CLSD...',
  airport_code: 'KJFK'
});

// Generate summary
const summary = await nlpAPI.summarizeDirect({
  notam_text: '...',
  weather_data: { ... },
  airport_code: 'KJFK'
});
```

## Complete Workflow Example

### 1. Pilot Input
User fills out FlightForm with:
```javascript
{
  origin: 'KJFK',
  destination: 'KSFO',
  altitude: 35000,
  aircraftType: 'B737',
  departureTime: '2024-01-15T10:00:00Z',
  pilotMetar: 'KJFK 151651Z 18005KT 10SM CLR 25/12 A3012'
}
```

### 2. Backend Processing

#### Step 1: Generate Flight Plan
**Request:** `POST /api/flightplan`
```json
{
  "origin": "KJFK",
  "destination": "KSFO", 
  "altitude": 35000,
  "aircraftType": "B737"
}
```

**Response:**
```json
{
  "success": true,
  "waypoints": [
    {"lat": 40.6413, "lon": -73.7781, "name": "KJFK", "type": "departure"},
    {"lat": 41.2619, "lon": -75.8606, "name": "AVP", "type": "waypoint"},
    {"lat": 39.7391, "lon": -84.2056, "name": "CVG", "type": "waypoint"},
    {"lat": 37.6213, "lon": -122.3790, "name": "KSFO", "type": "arrival"}
  ],
  "distance": 2586,
  "estimatedTime": "5h 30m"
}
```

#### Step 2: Get Route Weather
**Request:** `POST /api/weather/route`
```json
{
  "waypoints": [...],
  "radius": 50
}
```

**Response:**
```json
{
  "success": true,
  "weather": {
    "KJFK": {
      "metar": "KJFK 151651Z 18005KT 10SM CLR 25/12 A3012",
      "decoded": {...},
      "severity": "LOW"
    },
    "KSFO": {
      "metar": "KSFO 151651Z 28008KT 10SM FEW200 18/12 A3015",
      "decoded": {...}, 
      "severity": "LOW"
    }
  }
}
```

#### Step 3: Get NOTAMs
**Request:** `GET /api/notam/KJFK`

**Response:**
```json
{
  "success": true,
  "notams": [
    {
      "id": "A1234/23",
      "icao": "KJFK",
      "text": "A1234/23 KJFK RWY 04L/22R CLSD FOR CONST 2401151200-2401152359",
      "category": "RUNWAY",
      "severity": "HIGH",
      "effectiveDate": "2024-01-15T12:00:00Z",
      "expiryDate": "2024-01-15T23:59:00Z"
    }
  ]
}
```

#### Step 4: Forward to Python NLP
**Request to Python:** `POST http://localhost:8000/nlp/parse-notam`
```json
{
  "notam_text": "A1234/23 KJFK RWY 04L/22R CLSD FOR CONST 2401151200-2401152359",
  "airport_code": "KJFK"
}
```

**Python Response:**
```json
{
  "success": true,
  "notam_id": "A1234/23",
  "effective_date": "2024-01-15T12:00:00Z",
  "expiry_date": "2024-01-15T23:59:00Z",
  "location": "KJFK",
  "subject": "RUNWAY",
  "description": "Runway 04L/22R closed for construction",
  "severity": "HIGH",
  "category": "RUNWAY",
  "processed_by": "Python NLP Service",
  "processed_at": "2024-01-15T08:30:00Z"
}
```

#### Step 5: Generate Summary
**Request to Python:** `POST http://localhost:8000/nlp/summarize`
```json
{
  "notam_text": "A1234/23 KJFK RWY 04L/22R CLSD FOR CONST...",
  "weather_data": {"KJFK": {...}, "KSFO": {...}},
  "airport_code": "KJFK"
}
```

**Python Response:**
```json
{
  "success": true,
  "summary": "JFK Airport has runway closure affecting Runway 04L/22R due to construction. Weather conditions are favorable at both departure and arrival airports with clear skies and light winds.",
  "key_points": [
    "Runway 04L/22R closed at KJFK",
    "Construction work in progress", 
    "Clear weather conditions",
    "Light winds at both airports"
  ],
  "severity": "MEDIUM",
  "recommendations": [
    "Plan for alternate runway usage at JFK",
    "Expect possible taxi delays",
    "Weather conditions favorable for flight"
  ]
}
```

### 3. Frontend Display

The React frontend receives the complete briefing data and displays:

#### MapView Component
- Flight route from KJFK to KSFO with waypoints
- Weather stations marked with severity colors
- Clickable weather stations showing popup
- SIGMET overlays if present

#### NotamPanel Component  
- List of NOTAMs with AI parsing
- Generated summary with key points
- Filter options by category/severity
- Color-coded severity indicators

#### WeatherPopup Component
- Detailed weather when clicking map markers
- Decoded METAR/TAF information
- Human-readable conditions
- Severity assessment

## Error Handling

### Backend Fallbacks
- If Python NLP service is unavailable, Node.js provides basic text parsing
- Weather decoding falls back to simple regex parsing
- NOTAM processing continues with reduced functionality

### Frontend Resilience
- API failures show user-friendly messages
- Cached data used when possible
- Graceful degradation of features

### Service Health Checks
```javascript
// Check Python NLP service health
const health = await nlpAPI.checkHealth();
console.log(health.healthy); // true/false
```

## Environment Configuration

### Node.js Backend (.env)
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
PYTHON_NLP_URL=http://localhost:8000
```

### Python NLP Service (.env)
```env
PORT=8000
ENV=development
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
HF_TOKEN=your_huggingface_token_here
```

### React Frontend (.env)
```env
VITE_NODE_API_BASE=http://localhost:5000/api
VITE_PYTHON_NLP_BASE=http://localhost:8000
VITE_MAPBOX_KEY=your_mapbox_token_here
```

## Running the Complete System

### Start All Services
```bash
# Terminal 1 - Node.js Backend
cd backend-node
npm install
npm run dev

# Terminal 2 - Python NLP Service  
cd backend-python-nlp
pip install -r requirements.txt
python app.py

# Terminal 3 - React Frontend
cd frontend-react
npm install
npm run dev
```

### Verify Integration
1. Open http://localhost:3000
2. Fill flight form with demo data
3. Submit to generate complete briefing
4. Verify data flows: Frontend → Node.js → Python → Frontend

## API Testing Examples

### Test Flight Plan Generation
```bash
curl -X POST http://localhost:5000/api/flightplan \
  -H "Content-Type: application/json" \
  -d '{"origin":"KJFK","destination":"KSFO","altitude":35000}'
```

### Test NOTAM Parsing
```bash
curl -X POST http://localhost:8000/nlp/parse-notam \
  -H "Content-Type: application/json" \
  -d '{"notam_text":"A1234/23 KJFK RWY 04L/22R CLSD","airport_code":"KJFK"}'
```

### Test Weather Decoding
```bash
curl -X POST http://localhost:5000/api/weather/metar \
  -H "Content-Type: application/json" \  
  -d '{"metarString":"KJFK 151651Z 18005KT 10SM CLR 25/12 A3012","icao":"KJFK"}'
```

## Troubleshooting

### Common Issues
1. **CORS errors**: Verify CORS configuration in both backends
2. **Port conflicts**: Ensure services run on different ports  
3. **Missing API keys**: Check .env files for required tokens
4. **Python dependencies**: Install all requirements.txt packages
5. **MapBox errors**: Verify VITE_MAPBOX_KEY is set

### Debug Commands
```bash
# Check service health
curl http://localhost:5000/
curl http://localhost:8000/
curl http://localhost:3000/

# Check logs
# Node.js: Check terminal output
# Python: Check uvicorn logs
# React: Check browser console
```

This integration provides a complete aviation weather briefing system with AI-powered NOTAM analysis, comprehensive weather decoding, and interactive flight route visualization.