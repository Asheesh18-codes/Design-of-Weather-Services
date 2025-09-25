# Aviation Weather Briefing Backend

A comprehensive Node.js/Express backend API for aviation weather briefing system. This backend processes METAR, TAF, and NOTAM data to provide simplified weather information for pilots.

## 🚀 Features

- **METAR/TAF Decoding**: Converts coded weather reports to human-readable format
- **Flight Planning**: Generates waypoints and analyzes route weather conditions
- **Severity Classification**: Categorizes weather into CLEAR/SIGNIFICANT/SEVERE levels
- **NOTAM Processing**: Summarizes and categorizes NOTAMs using NLP
- **Real-time Weather**: Fetches live aviation weather data
- **Route Safety Analysis**: Comprehensive safety assessment for flight routes

## 📋 API Endpoints

### Weather Services (`/api/weather`)
- `POST /metar` - Decode METAR data
- `POST /taf` - Decode TAF data  
- `GET /current/:icao` - Get current weather for airport
- `GET /forecast/:icao` - Get forecast for airport
- `POST /briefing` - Multi-airport weather briefing

### Flight Planning (`/api/flightplan`)
- `POST /generate` - Generate flight plan with waypoints
- `POST /briefing` - Get weather briefing for route
- `POST /analyze` - Analyze route safety

### NOTAM Services (`/api/notam`)
- `POST /summarize` - Summarize NOTAMs using NLP
- `GET /:icao` - Get NOTAMs for airport
- `POST /parse` - Parse and categorize NOTAMs
- `POST /route-critical` - Get critical NOTAMs for route

### Severity Classification (`/api/severity`)
- `POST /classify` - Classify weather severity
- `POST /route` - Classify route safety
- `GET /info` - Get severity definitions

## 🛠️ Installation & Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Start production server:**
   ```bash
   npm start
   ```

5. **Run tests:**
   ```bash
   npm test
   ```

## 🔧 Configuration

Key environment variables in `.env`:
- `PORT` - Server port (default: 5000)
- `AVIATION_WEATHER_API_URL` - Aviation weather API URL
- `PYTHON_NLP_URL` - Python NLP service URL
- `NODE_ENV` - Environment (development/production)

## 📊 Project Structure

```
backend-node/
├── server.js              # Main application entry
├── package.json           # Dependencies & scripts
├── .env.example          # Environment template
├── controllers/          # Business logic
│   ├── flightPlanController.js
│   ├── weatherController.js
│   ├── severityController.js
│   └── notamController.js
├── routes/              # API route definitions
│   ├── flightPlanRoutes.js
│   ├── weatherRoutes.js
│   └── notamRoutes.js
├── utils/               # Core utilities
│   ├── metarDecoder.js
│   ├── tafDecoder.js
│   ├── waypointGenerator.js
│   ├── severityClassifier.js
│   └── apiFetcher.js
└── tests/              # Test suites
    ├── test_weather.js
    ├── test_flightplan.js
    └── test_waypoints.js
```

## 🧪 Testing

The backend includes comprehensive test suites:

- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **Mock Data**: Fallback when external APIs are unavailable

Run specific test suites:
```bash
# Weather API tests
npm test -- test_weather.js

# Flight planning tests  
npm test -- test_flightplan.js

# Waypoint generation tests
npm test -- test_waypoints.js
```

## 🌐 External Dependencies

- **Aviation Weather API**: Live METAR/TAF data
- **Python NLP Service**: NOTAM summarization (optional)
- **In-memory caching**: 5-minute cache for weather data

## 📈 Usage Examples

### Decode METAR
```javascript
POST /api/weather/metar
{
  "metarString": "KJFK 121851Z 24016G24KT 10SM BKN250 22/13 A3000 RMK AO2"
}
```

### Generate Flight Plan
```javascript
POST /api/flightplan/generate
{
  "origin": "KJFK",
  "destination": "KLAX",
  "altitude": 35000
}
```

### Weather Briefing
```javascript
POST /api/weather/briefing
{
  "airports": ["KJFK", "KLGA", "KEWR"]
}
```

## ⚡ Performance Features

- **Caching**: 5-minute cache for weather data
- **Fallback**: Mock data when external APIs fail
- **Timeout Handling**: 10-second request timeouts
- **Error Recovery**: Graceful degradation

## 🔒 Security Features

- **CORS**: Cross-origin request handling
- **Input Validation**: Parameter validation
- **Error Handling**: Secure error responses
- **Rate Limiting**: Ready for rate limiting middleware

## 🚦 Health Check

The server provides a health check endpoint at `/`:
```javascript
GET /
// Returns server status, version, and available endpoints
```

## 📝 Development Notes

- **Mock Data**: Used when external APIs are unavailable
- **Airport Database**: Includes major US and international airports
- **Severity Levels**: CLEAR/SIGNIFICANT/SEVERE classification
- **Time Calculations**: Realistic flight time estimates

## 🎯 Hackathon Ready

This backend is designed for rapid development and demonstration:
- ✅ Complete API structure
- ✅ Mock data fallbacks
- ✅ Comprehensive error handling
- ✅ Test coverage
- ✅ Clear documentation
- ✅ Easy setup and deployment