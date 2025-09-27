# 📡 Aviation Weather Services - API Documentation

## Overview

The Aviation Weather Services API provides comprehensive weather data for aviation operations, including real-time METAR, TAF forecasts, NOTAMs, and intelligent AI-powered analysis.

**Base URLs:**
- Backend API: `http://localhost:5000/api`
- NLP Service: `http://localhost:8000`

## Authentication

Currently, the API uses API keys for external weather services:
- **CheckWX API Key**: Required for backup weather data
- **OpenAI API Key**: Optional for enhanced AI features

## Rate Limiting

- **Primary API**: No limits (uses aviationweather.gov)
- **CheckWX Backup**: 1000 requests/month (free tier)
- **Internal APIs**: No limits

---

## 🌤️ Weather Endpoints

### Get Current Weather (METAR)

**GET** `/api/weather/current/:icao`

Retrieves current weather conditions for a specific airport.

#### Parameters
- `icao` (path): 4-letter ICAO airport code (e.g., KJFK, EGLL)

#### Response
```json
{
  "success": true,
  "data": {
    "icao": "KJFK",
    "raw": "KJFK 271851Z 28014KT 10SM FEW250 24/18 A3012 RMK AO2 SLP201",
    "decoded": {
      "airport": "KJFK",
      "time": "271851Z",
      "wind": {
        "direction": 280,
        "speed": 14,
        "unit": "KT"
      },
      "visibility": "10SM",
      "clouds": [
        {
          "coverage": "FEW",
          "altitude": 25000
        }
      ],
      "temperature": 24,
      "dewpoint": 18,
      "pressure": {
        "altimeter": "A3012",
        "sea_level": "SLP201"
      }
    },
    "timestamp": "2025-09-27T18:51:00Z",
    "source": "aviationweather"
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": "Airport not found or invalid ICAO code",
  "code": "AIRPORT_NOT_FOUND"
}
```

---

### Get Weather Forecast (TAF)

**GET** `/api/weather/forecast/:icao`

Retrieves Terminal Aerodrome Forecast for a specific airport.

#### Parameters
- `icao` (path): 4-letter ICAO airport code

#### Response
```json
{
  "success": true,
  "data": {
    "icao": "KJFK",
    "raw": "TAF KJFK 271720Z 2718/2824 28012KT 10SM FEW250...",
    "decoded": {
      "airport": "KJFK",
      "issue_time": "271720Z",
      "valid_period": {
        "from": "2718",
        "to": "2824"
      },
      "forecast_periods": [
        {
          "period": "2718/2724",
          "wind": {
            "direction": 280,
            "speed": 12,
            "unit": "KT"
          },
          "visibility": "10SM",
          "clouds": [
            {
              "coverage": "FEW",
              "altitude": 25000
            }
          ],
          "changes": []
        }
      ]
    },
    "ai_summary": {
      "conditions": "Generally good flying conditions expected",
      "recommendations": [
        "Good visibility throughout the period",
        "Light winds from the west",
        "No significant weather concerns"
      ],
      "severity": "LOW"
    },
    "timestamp": "2025-09-27T17:20:00Z",
    "source": "aviationweather"
  }
}
```

---

### Decode METAR String

**POST** `/api/weather/metar`

Decodes a raw METAR string into structured data.

#### Request Body
```json
{
  "metar": "KJFK 271851Z 28014KT 10SM FEW250 24/18 A3012 RMK AO2 SLP201"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "raw": "KJFK 271851Z 28014KT 10SM FEW250 24/18 A3012 RMK AO2 SLP201",
    "decoded": {
      // Same structure as GET /current/:icao
    }
  }
}
```

---

### Decode TAF String

**POST** `/api/weather/taf`

Decodes a raw TAF string into structured data with AI analysis.

#### Request Body
```json
{
  "taf": "TAF KJFK 271720Z 2718/2824 28012KT 10SM FEW250..."
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "raw": "TAF KJFK 271720Z 2718/2824 28012KT 10SM FEW250...",
    "decoded": {
      // Structured TAF data
    },
    "ai_analysis": {
      "summary": "Favorable conditions with light westerly winds",
      "flight_recommendations": [
        "Excellent conditions for VFR flights",
        "No weather-related concerns"
      ]
    }
  }
}
```

---

### Multi-Airport Weather Briefing

**POST** `/api/weather/briefing`

Get comprehensive weather briefing for multiple airports.

#### Request Body
```json
{
  "airports": ["KJFK", "KLGA", "KEWR"],
  "include_taf": true,
  "include_notams": true
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "briefing_time": "2025-09-27T19:00:00Z",
    "airports": {
      "KJFK": {
        "metar": { /* METAR data */ },
        "taf": { /* TAF data */ },
        "notams": [ /* NOTAM array */ ]
      },
      // ... other airports
    },
    "summary": {
      "overall_conditions": "GOOD",
      "concerns": [],
      "recommendations": [
        "All airports reporting good conditions",
        "No significant weather impacts expected"
      ]
    }
  }
}
```

---

## ✈️ Flight Planning Endpoints

### Generate Flight Plan

**POST** `/api/flightplan`

Generate waypoints and route information between airports.

#### Request Body
```json
{
  "departure": "KJFK",
  "arrival": "KLAX",
  "aircraft_type": "B738",
  "cruise_altitude": 37000,
  "route": "DCT"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "route": {
      "departure": "KJFK",
      "arrival": "KLAX",
      "distance": 2475,
      "estimated_time": "5:30"
    },
    "waypoints": [
      {
        "name": "KJFK",
        "type": "AIRPORT",
        "coordinates": [40.6413, -73.7781],
        "altitude": 13
      },
      // ... intermediate waypoints
    ],
    "weather_analysis": {
      "route_conditions": "FAVORABLE",
      "weather_concerns": [],
      "alternate_recommendations": ["KORD", "KDEN"]
    }
  }
}
```

---

### Route Weather Analysis

**POST** `/api/flightplan/analyze`

Analyze weather conditions along a flight route.

#### Request Body
```json
{
  "waypoints": [
    {"icao": "KJFK", "coordinates": [40.6413, -73.7781]},
    {"icao": "KLAX", "coordinates": [34.0522, -118.2437]}
  ],
  "altitude": 37000,
  "departure_time": "2025-09-27T20:00:00Z"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "route_analysis": {
      "overall_conditions": "GOOD",
      "weather_hazards": [],
      "turbulence_forecast": "LIGHT",
      "icing_potential": "NIL"
    },
    "waypoint_weather": {
      "KJFK": { /* Weather data */ },
      "KLAX": { /* Weather data */ }
    },
    "recommendations": [
      "Route clear of significant weather",
      "Consider FL390 for smoother ride"
    ]
  }
}
```

---

## 🏢 Airport Information Endpoints

### Get Airport Information

**GET** `/api/airports/info/:icao`

Retrieve detailed airport information.

#### Response
```json
{
  "success": true,
  "data": {
    "icao": "KJFK",
    "iata": "JFK",
    "name": "John F Kennedy International Airport",
    "city": "New York",
    "country": "United States",
    "coordinates": {
      "latitude": 40.6413,
      "longitude": -73.7781
    },
    "elevation": 13,
    "runways": [
      {
        "designation": "04L/22R",
        "length": 14511,
        "width": 150,
        "surface": "ASP"
      }
    ],
    "frequencies": {
      "tower": "119.1",
      "ground": "121.9",
      "approach": "125.25"
    }
  }
}
```

---

### Get Airport Coordinates

**GET** `/api/airports/coordinates/:icao`

Get just the coordinates for an airport.

#### Response
```json
{
  "success": true,
  "data": {
    "icao": "KJFK",
    "coordinates": {
      "latitude": 40.6413,
      "longitude": -73.7781
    },
    "elevation": 13
  }
}
```

---

## 🤖 NLP Service Endpoints

### Process TAF with AI

**POST** `/nlp/process-taf`

Get AI-powered analysis and summary of TAF data.

#### Request Body
```json
{
  "taf": "TAF KJFK 271720Z 2718/2824 28012KT 10SM FEW250 TEMPO 2720/2724 BKN015",
  "airport": "KJFK"
}
```

#### Response
```json
{
  "success": true,
  "analysis": {
    "summary": "Generally good conditions with temporary low clouds expected between 20Z and 24Z",
    "flight_impact": {
      "vfr_conditions": "MOSTLY_YES",
      "ifr_probability": "LOW_TEMPORARY",
      "concerns": ["Temporary low ceiling 2000-2400Z"]
    },
    "recommendations": [
      "Plan arrival before 20Z or after 24Z for best VFR conditions",
      "Have IFR alternate ready during temporary period",
      "Monitor conditions if arriving 20-24Z"
    ],
    "severity_rating": "MODERATE",
    "confidence": 0.95
  },
  "processing_time": 0.45
}
```

---

### Get NLP Service Health

**GET** `/nlp/health`

Check NLP service status and capabilities.

#### Response
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "capabilities": [
    "taf_analysis",
    "weather_summarization",
    "flight_recommendations"
  ],
  "model_info": {
    "language_model": "gpt-3.5-turbo",
    "aviation_domain": "specialized"
  },
  "uptime": 86400,
  "processed_requests": 1250
}
```

---

## 📊 System Health Endpoints

### Backend Health Check

**GET** `/api/health`

Check overall system health and status.

#### Response
```json
{
  "status": "healthy",
  "timestamp": "2025-09-27T19:00:00Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "weather_apis": {
      "aviationweather": "operational",
      "checkwx": "operational"
    },
    "nlp_service": "connected"
  },
  "uptime": 172800,
  "memory_usage": "45%",
  "request_count": 15420
}
```

---

### Debug TAF Endpoint

**GET** `/api/weather/debug/taf/:icao`

Debug TAF fetching and processing for troubleshooting.

#### Response
```json
{
  "success": true,
  "debug_info": {
    "icao": "KJFK",
    "primary_api_status": "success",
    "backup_api_status": "not_used",
    "processing_time": 0.25,
    "data_source": "aviationweather.gov",
    "cache_status": "miss",
    "validation_results": {
      "format_valid": true,
      "periods_complete": true,
      "time_valid": true
    }
  },
  "raw_data": "TAF KJFK 271720Z 2718/2824...",
  "processed_data": { /* Full TAF data */ }
}
```

---

## 🚨 Error Handling

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `AIRPORT_NOT_FOUND` | Invalid or unknown ICAO code | 404 |
| `WEATHER_DATA_UNAVAILABLE` | No weather data available | 503 |
| `API_KEY_INVALID` | Invalid or missing API key | 401 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `INVALID_REQUEST` | Malformed request body | 400 |
| `SERVICE_UNAVAILABLE` | External service down | 503 |

### Standard Error Response Format

```json
{
  "success": false,
  "error": "Detailed error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-09-27T19:00:00Z",
  "request_id": "req_12345"
}
```

---

## 📝 Request/Response Headers

### Required Headers

```http
Content-Type: application/json
Accept: application/json
```

### Optional Headers

```http
X-Request-ID: unique-request-identifier
User-Agent: YourApp/1.0.0
```

### Response Headers

```http
Content-Type: application/json
X-Response-Time: 0.25s
X-Data-Source: aviationweather
Cache-Control: max-age=300
```

---

## 🔧 Configuration

### Environment Variables

```env
# Backend Configuration
PORT=5000
NODE_ENV=development
WEATHER_API_KEY=your_checkwx_key
FRONTEND_URL=http://localhost:5173

# NLP Service
OPENAI_API_KEY=your_openai_key
NLP_PORT=8000
```

---

## 📚 SDK Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

class WeatherAPI {
  constructor(baseURL = 'http://localhost:5000/api') {
    this.client = axios.create({ baseURL });
  }

  async getCurrentWeather(icao) {
    const response = await this.client.get(`/weather/current/${icao}`);
    return response.data;
  }

  async getForecast(icao) {
    const response = await this.client.get(`/weather/forecast/${icao}`);
    return response.data;
  }

  async getWeatherBriefing(airports) {
    const response = await this.client.post('/weather/briefing', {
      airports,
      include_taf: true,
      include_notams: true
    });
    return response.data;
  }
}

// Usage
const weather = new WeatherAPI();
const kjfkWeather = await weather.getCurrentWeather('KJFK');
```

### Python

```python
import requests
from typing import Dict, List

class WeatherAPI:
    def __init__(self, base_url: str = "http://localhost:5000/api"):
        self.base_url = base_url

    def get_current_weather(self, icao: str) -> Dict:
        response = requests.get(f"{self.base_url}/weather/current/{icao}")
        return response.json()

    def get_forecast(self, icao: str) -> Dict:
        response = requests.get(f"{self.base_url}/weather/forecast/{icao}")
        return response.json()

    def get_weather_briefing(self, airports: List[str]) -> Dict:
        payload = {
            "airports": airports,
            "include_taf": True,
            "include_notams": True
        }
        response = requests.post(f"{self.base_url}/weather/briefing", json=payload)
        return response.json()

# Usage
weather = WeatherAPI()
kjfk_weather = weather.get_current_weather('KJFK')
```

---

## 🧪 Testing

### Using curl

```bash
# Get current weather
curl -X GET "http://localhost:5000/api/weather/current/KJFK" \
     -H "Content-Type: application/json"

# Get forecast
curl -X GET "http://localhost:5000/api/weather/forecast/KJFK" \
     -H "Content-Type: application/json"

# Post weather briefing request
curl -X POST "http://localhost:5000/api/weather/briefing" \
     -H "Content-Type: application/json" \
     -d '{"airports": ["KJFK", "KLGA"], "include_taf": true}'
```

### Using Postman

1. Import the API collection (if provided)
2. Set base URL to `http://localhost:5000/api`
3. Test individual endpoints with sample data

---

## 📞 Support

For API issues or questions:
1. Check the [troubleshooting section](../README.md#-troubleshooting)
2. Review error codes above
3. Create an issue on GitHub with API request/response details

---

*Last updated: September 27, 2025*