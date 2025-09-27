# ✈️ Aviation Weather Services - Intelligent Flight Briefing System

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node.js-18%2B-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/python-3.8%2B-blue.svg)](https://python.org/)
[![React](https://img.shields.io/badge/react-18%2B-61dafb.svg)](https://reactjs.org/)

An advanced aviation weather briefing system that provides pilots with comprehensive weather information, intelligent TAF/METAR analysis, and AI-powered flight recommendations.

## 🌟 Features

### 🌤️ **Comprehensive Weather Data**
- **Real-time METAR** - Current weather conditions
- **TAF Forecasts** - Terminal Aerodrome Forecasts with period analysis
- **NOTAMs** - Notices to Airmen for operational information
- **SIGMETs & PIREPs** - Significant weather and pilot reports
- **Route Weather** - Weather analysis along flight paths

### 🤖 **AI-Powered Analysis**
- **Intelligent TAF Summarization** - AI-generated weather summaries
- **Flight Recommendations** - Smart suggestions based on conditions
- **Severity Classification** - Automated weather severity assessment
- **Trend Analysis** - Weather pattern recognition and forecasting

### 🛡️ **Enterprise-Grade Reliability**
- **Multi-Source Data** - Primary + CheckWX backup APIs
- **Automatic Failover** - Seamless switching between data sources
- **Data Persistence** - LocalStorage caching with smart refresh
- **Error Handling** - Comprehensive error recovery mechanisms

### 🎯 **User Experience**
- **Intuitive Interface** - Modern React-based dashboard
- **Real-time Updates** - Live weather data with smart caching
- **Mobile Responsive** - Works on all devices
- **Offline Capability** - Cached data availability

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Frontend      │    │   Backend        │    │   NLP Service       │
│   React + Vite  │◄──►│   Node.js        │◄──►│   Python + FastAPI  │
│   Port: 5173    │    │   Express        │    │   Port: 8000        │
└─────────────────┘    │   Port: 5000     │    └─────────────────────┘
                       └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   External APIs  │
                    │  AviationWeather │
                    │     CheckWX      │
                    └──────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.8+ and pip
- **Git** for version control

### 1. Clone Repository
```bash
git clone https://github.com/Asheesh18-codes/Design-of-Weather-Services.git
cd Design-of-Weather-Services
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your API keys
# WEATHER_API_KEY=your_checkwx_api_key_here

# Frontend environment for Mapbox
cd frontend-react
# Create .env file and add:  
# VITE_MAPBOX_TOKEN=your_mapbox_access_token_here
```

### 3. Install Dependencies

#### Backend (Node.js)
```bash
cd backend-node
npm install
```

#### Frontend (React)
```bash
cd ../frontend-react
npm install
```

#### NLP Service (Python)
```bash
cd ../backend-python-nlp
pip install -r requirements.txt
```

### 4. Start Services

#### Option A: Start All Services (Recommended)
```bash
# Windows
.\start-all-services.ps1

# Linux/macOS  
./start-all-services.sh
```

#### Option B: Start Individually
```bash
# Terminal 1: Backend API
cd backend-node
npm start

# Terminal 2: Frontend
cd frontend-react
npm run dev

# Terminal 3: NLP Service
cd backend-python-nlp
python app.py
```

### 5. Access Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **NLP Service**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 📁 Project Structure

```
Design-of-Weather-Services/
├── 📁 frontend-react/          # React frontend application
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── services/           # API integration
│   │   └── styles/            # CSS styling
│   └── package.json
├── 📁 backend-node/           # Node.js backend API
│   ├── controllers/           # Route handlers
│   ├── routes/               # API endpoints
│   ├── utils/                # Utility functions
│   │   ├── apiFetcher.js     # Weather data fetching
│   │   ├── metarDecoder.js   # METAR parsing
│   │   └── tafDecoder.js     # TAF parsing
│   └── server.js
├── 📁 backend-python-nlp/     # Python NLP service
│   ├── nlp/                  # NLP modules
│   │   ├── aviation_weather_api.py
│   │   ├── notam_parser.py
│   │   └── summary_model.py
│   └── app.py
├── 📁 docs/                  # Documentation
└── 📁 scripts/               # Utility scripts
```

## 🔧 Configuration

### Environment Variables

#### Backend Node.js (`.env`)
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
PYTHON_NLP_URL=http://localhost:8000
WEATHER_API_KEY=your_checkwx_api_key
```

#### Frontend React (`.env`)
```env
VITE_MAPBOX_TOKEN=your_mapbox_access_token
```

#### Python NLP Service
```env
PORT=8000
OPENAI_API_KEY=your_openai_key  # Optional for enhanced AI
```

### API Keys Setup

1. **CheckWX API** (Backup weather data)
   - Visit: https://api.checkwx.com
   - Sign up for free API key
   - Add to `.env` as `WEATHER_API_KEY`

2. **Mapbox API** (Interactive maps and visualization)
   - Visit: https://account.mapbox.com/
   - Create account and get access token
   - Add to frontend environment as `VITE_MAPBOX_TOKEN`

3. **OpenAI API** (Enhanced AI features)
   - Visit: https://platform.openai.com
   - Generate API key
   - Add to Python service environment

## 📚 API Endpoints

### Weather API (`/api/weather`)
- `GET /current/:icao` - Current METAR data
- `GET /forecast/:icao` - TAF forecast data  
- `POST /metar` - Decode METAR string
- `POST /taf` - Decode TAF string
- `POST /briefing` - Multi-airport weather briefing

### Flight Planning (`/api/flightplan`)
- `POST /` - Generate flight plan waypoints
- `POST /analyze` - Route weather analysis

### Airport Data (`/api/airports`)
- `GET /info/:icao` - Airport information
- `GET /coordinates/:icao` - Airport coordinates

### NLP Service (`/nlp`)
- `POST /process-taf` - AI TAF analysis
- `GET /docs` - API documentation

## 🧪 Testing

### Run Tests
```bash
# Backend tests
cd backend-node
npm test

# Python service tests  
cd backend-python-nlp
pytest

# Frontend tests
cd frontend-react
npm test
```

### Health Checks
- Backend: http://localhost:5000/api/health
- NLP Service: http://localhost:8000/health

## 🔍 Features Deep Dive

### Smart Data Persistence
- **LocalStorage Caching**: Weather data persists across sessions
- **Smart Refresh**: Prevents data loss during continuous updates
- **Forecast Period Validation**: Maintains complete TAF periods
- **User Interaction Protection**: No refreshes during active use

### Multi-Source Weather Data
```javascript
Primary API → CheckWX Backup → Mock Data (Fallback)
```
- **Automatic failover** ensures 99.9% uptime
- **Rate limiting protection** with intelligent retry logic
- **Data validation** ensures forecast period completeness

### AI Weather Analysis
- **Natural Language Summaries**: Convert complex TAF data to readable text
- **Flight Recommendations**: Smart suggestions based on conditions
- **Trend Detection**: Identify improving/deteriorating patterns
- **Risk Assessment**: Automated severity classification

## 🚨 Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Kill processes on specific ports
npx kill-port 5000 5173 8000
```

#### Missing Dependencies
```bash
# Reinstall all dependencies
npm install --force
pip install -r requirements.txt --force-reinstall
```

#### API Key Issues
1. Verify CheckWX API key in `.env`
2. Check API key permissions and limits
3. Test with curl: `curl -H "X-API-Key: YOUR_KEY" https://api.checkwx.com/metar/KJFK`

#### Python Module Errors
```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

### Debug Mode
```bash
# Enable debug logging
NODE_ENV=development npm start
DEBUG=1 python app.py
```

## 🤝 Contributing

1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** Pull Request

### Development Guidelines
- Follow ESLint configuration for JavaScript
- Use PEP 8 for Python code
- Add tests for new features
- Update documentation

## 📊 Performance & Monitoring

### Key Metrics
- **Response Time**: < 2s for weather data
- **Cache Hit Rate**: > 80% for repeated requests
- **API Uptime**: > 99.5% with failover
- **Error Rate**: < 1% with comprehensive handling

### Monitoring Endpoints
- `/api/health` - System health check
- `/api/weather/debug/taf/:icao` - TAF debugging
- `/metrics` - Performance metrics (if enabled)

## 📈 Roadmap

### Version 2.0 Planned Features
- [ ] **Advanced Route Planning** - Multi-leg flight optimization
- [ ] **Weather Radar Integration** - Live precipitation data
- [ ] **Mobile App** - Native iOS/Android applications
- [ ] **Real-time Alerts** - Weather condition notifications
- [ ] **Historical Analysis** - Weather pattern trends
- [ ] **Multi-language Support** - International aviation weather

### Version 1.5 Features
- [x] AI-powered TAF analysis
- [x] Multi-source data reliability
- [x] Smart caching and persistence
- [x] Comprehensive error handling
- [x] Real-time weather updates

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Authors

**Asheesh Singh** - *Project Lead*
- GitHub: [@Asheesh18-codes](https://github.com/Asheesh18-codes)

**Devansh Jha** - *Co-developer*
- GitHub: [@devanshjhaa](https://github.com/devanshjhaa)

**Eshwar Yadu** - *Co-developer*  
- GitHub: [@eshwar23567](https://github.com/eshwar23567)

**Rishi Dwivedi** - *Co-developer*
- GitHub: [@rishidwi20](https://github.com/rishidwi20)

**Project Repository**: [Design-of-Weather-Services](https://github.com/Asheesh18-codes/Design-of-Weather-Services)

## 🙏 Acknowledgments

- **AviationWeather.gov** - Primary weather data source
- **CheckWX API** - Backup weather data provider
- **React Community** - Frontend framework excellence
- **FastAPI Team** - Python web framework innovation
- **Aviation Community** - Domain expertise and feedback

## 📞 Support

### Getting Help
1. Check [Troubleshooting](#-troubleshooting) section
2. Search [GitHub Issues](https://github.com/Asheesh18-codes/Design-of-Weather-Services/issues)
3. Create new issue with detailed description
4. Join discussions in repository

### Bug Reports
Please include:
- Operating system and version
- Node.js and Python versions
- Complete error messages
- Steps to reproduce
- Expected vs actual behavior

---

**Built with ❤️ for the aviation community**

*Safe flights and clear skies!* ✈️🌤️
