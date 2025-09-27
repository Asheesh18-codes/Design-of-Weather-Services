# 👩‍💻 Aviation Weather Services - Developer Guide

## Overview

Welcome to the Aviation Weather Services development team! This guide provides comprehensive information for developers contributing to the project, including setup procedures, coding standards, testing practices, and architectural guidelines.

## 🏗️ Development Environment Setup

### Prerequisites

#### Required Software
- **Node.js**: v18.0.0 or later
- **Python**: 3.8 or later
- **Git**: Latest version
- **Code Editor**: VS Code recommended (with extensions)

#### Recommended VS Code Extensions
```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "ms-python.python",
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "ms-python.flake8",
    "ms-python.black-formatter"
  ]
}
```

### Repository Setup

#### 1. Clone and Fork
```bash
# Fork the repository on GitHub first, then clone your fork
git clone https://github.com/YOUR_USERNAME/Design-of-Weather-Services.git
cd Design-of-Weather-Services

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_USERNAME/Design-of-Weather-Services.git

# Verify remotes
git remote -v
```

#### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your API keys
# Required: CHECKWX_API_KEY, OPENAI_API_KEY, MAPBOX_ACCESS_TOKEN
```

#### 3. Install Dependencies

**Frontend Setup:**
```bash
cd frontend-react
npm install
npm run dev  # Should start on port 5173
```

**Backend Setup:**
```bash
cd ../backend-node
npm install
npm start    # Should start on port 5000
```

**NLP Service Setup:**
```bash
cd ../backend-python-nlp
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
python app.py  # Should start on port 8000
```

#### 4. Verify Installation
```bash
# Check all services are running
curl http://localhost:5000/api/health
curl http://localhost:8000/health
# Frontend should be accessible at http://localhost:5173
```

---

## 📋 Project Structure

### High-Level Architecture
```
Design-of-Weather-Services/
├── frontend-react/          # React + Vite frontend
├── backend-node/           # Node.js + Express API
├── backend-python-nlp/     # Python + FastAPI NLP service
├── docs/                   # Documentation
├── scripts/               # Utility scripts
└── README.md
```

### Frontend Structure (`frontend-react/`)
```
src/
├── components/
│   ├── FlightForm.jsx     # Main input form
│   └── MapView.jsx        # Mapbox integration
├── services/
│   └── api.js            # API communication layer
├── App.jsx               # Main application component
├── main.jsx             # Application entry point
└── styles.css           # Global styles (Tailwind)
```

### Backend Structure (`backend-node/`)
```
controllers/
├── weatherController.js   # Weather data handling
├── flightPlanController.js # Flight planning logic
├── notamController.js     # NOTAM processing
└── severityController.js  # Weather severity analysis

routes/
├── weatherRoutes.js      # Weather API endpoints
├── flightPlanRoutes.js   # Flight planning endpoints
└── notamRoutes.js        # NOTAM endpoints

utils/
├── apiFetcher.js         # External API communication
├── metarDecoder.js       # METAR parsing
├── tafDecoder.js         # TAF parsing
└── waypointGenerator.js  # Flight path generation
```

### NLP Service Structure (`backend-python-nlp/`)
```
nlp/
├── aviation_weather_api.py  # Weather data processing
├── notam_parser.py         # NOTAM analysis
└── summary_model.py        # AI summarization

tests/
└── test_notam_parser.py    # Unit tests
```

---

## 🎨 Coding Standards

### JavaScript/React Standards

#### Code Style
```javascript
// Use ES6+ features
const weatherData = await fetchWeatherData(icaoCode);

// Prefer functional components with hooks
const WeatherComponent = ({ icaoCode }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const loadWeather = async () => {
      setLoading(true);
      try {
        const data = await fetchWeatherData(icaoCode);
        setWeather(data);
      } catch (error) {
        console.error('Failed to load weather:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (icaoCode) loadWeather();
  }, [icaoCode]);
  
  return loading ? <LoadingSpinner /> : <WeatherDisplay weather={weather} />;
};
```

#### Naming Conventions
- **Files**: camelCase (e.g., `weatherController.js`)
- **Components**: PascalCase (e.g., `WeatherDisplay`)
- **Functions/Variables**: camelCase (e.g., `fetchWeatherData`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)

#### Error Handling
```javascript
// Always handle errors gracefully
const fetchWeatherData = async (icaoCode) => {
  try {
    const response = await fetch(`/api/weather/${icaoCode}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Weather fetch failed:', error);
    throw error; // Re-throw for component handling
  }
};
```

#### Component Structure
```javascript
// Standard component template
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const ComponentName = ({ prop1, prop2 }) => {
  // 1. State declarations
  const [state, setState] = useState(initialValue);
  
  // 2. Effect hooks
  useEffect(() => {
    // Side effects
  }, [dependencies]);
  
  // 3. Event handlers
  const handleEvent = (event) => {
    // Handler logic
  };
  
  // 4. Render helpers (if needed)
  const renderHelper = () => {
    return <div>Helper content</div>;
  };
  
  // 5. Main render
  return (
    <div className="component-wrapper">
      {/* Component JSX */}
    </div>
  );
};

// PropTypes definition
ComponentName.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.object
};

export default ComponentName;
```

### Python Standards

#### Code Style (PEP 8)
```python
# Use type hints
from typing import Optional, Dict, List
import asyncio

async def process_weather_data(
    icao_code: str, 
    include_forecast: bool = True
) -> Dict[str, any]:
    """
    Process weather data for given ICAO code.
    
    Args:
        icao_code: 4-letter ICAO airport code
        include_forecast: Whether to include forecast data
        
    Returns:
        Dictionary containing processed weather data
        
    Raises:
        ValueError: If ICAO code is invalid
        APIException: If external API call fails
    """
    if not icao_code or len(icao_code) != 4:
        raise ValueError(f"Invalid ICAO code: {icao_code}")
    
    try:
        weather_data = await fetch_weather_data(icao_code)
        processed_data = {
            "icao": icao_code,
            "current": parse_metar(weather_data["metar"]),
            "timestamp": weather_data["timestamp"]
        }
        
        if include_forecast and "taf" in weather_data:
            processed_data["forecast"] = parse_taf(weather_data["taf"])
            
        return processed_data
        
    except Exception as e:
        logger.error(f"Failed to process weather for {icao_code}: {e}")
        raise APIException(f"Weather processing failed: {e}")
```

#### Class Structure
```python
class WeatherProcessor:
    """Processes aviation weather data with AI analysis."""
    
    def __init__(self, api_key: str, model_name: str = "gpt-3.5-turbo"):
        self.api_key = api_key
        self.model_name = model_name
        self._client = OpenAI(api_key=api_key)
        self.logger = logging.getLogger(__name__)
    
    async def analyze_conditions(
        self, 
        metar: str, 
        taf: Optional[str] = None
    ) -> Dict[str, any]:
        """Analyze weather conditions with AI."""
        # Method implementation
        pass
    
    def _parse_visibility(self, visibility_str: str) -> float:
        """Parse visibility string to numeric value."""
        # Private method implementation
        pass
```

#### Error Handling
```python
# Custom exception classes
class WeatherServiceException(Exception):
    """Base exception for weather service errors."""
    pass

class APIException(WeatherServiceException):
    """Raised when external API calls fail."""
    pass

class ValidationError(WeatherServiceException):
    """Raised when input validation fails."""
    pass

# Usage in functions
async def fetch_weather_data(icao_code: str) -> Dict[str, any]:
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{API_URL}/{icao_code}") as response:
                if response.status != 200:
                    raise APIException(f"API returned {response.status}")
                return await response.json()
    except aiohttp.ClientError as e:
        raise APIException(f"Network error: {e}")
    except Exception as e:
        logger.exception(f"Unexpected error fetching weather: {e}")
        raise WeatherServiceException(f"Weather fetch failed: {e}")
```

### CSS/Styling Standards

#### Tailwind CSS Usage
```jsx
// Use Tailwind utilities consistently
const WeatherCard = ({ weather }) => (
  <div className="bg-white rounded-lg shadow-md p-6 mb-4">
    <h2 className="text-xl font-semibold text-gray-800 mb-3">
      Current Conditions
    </h2>
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-600">Temperature</span>
        <span className="text-lg text-gray-900">{weather.temperature}°C</span>
      </div>
    </div>
  </div>
);
```

#### Custom CSS (when needed)
```css
/* Use CSS custom properties for theming */
:root {
  --primary-color: #2563eb;
  --secondary-color: #64748b;
  --success-color: #16a34a;
  --warning-color: #d97706;
  --error-color: #dc2626;
}

/* BEM methodology for custom components */
.weather-card {
  @apply bg-white rounded-lg shadow-md;
}

.weather-card__header {
  @apply text-xl font-semibold text-gray-800 mb-3;
}

.weather-card__content {
  @apply grid grid-cols-2 gap-4;
}
```

---

## 🧪 Testing Standards

### Frontend Testing (Jest + React Testing Library)

#### Component Tests
```javascript
// WeatherDisplay.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeatherDisplay from './WeatherDisplay';

describe('WeatherDisplay', () => {
  const mockWeatherData = {
    icao: 'KJFK',
    temperature: 22,
    visibility: 10,
    conditions: 'Clear'
  };

  test('renders weather data correctly', () => {
    render(<WeatherDisplay weather={mockWeatherData} />);
    
    expect(screen.getByText('KJFK')).toBeInTheDocument();
    expect(screen.getByText('22°C')).toBeInTheDocument();
    expect(screen.getByText('10 SM')).toBeInTheDocument();
  });

  test('shows loading state', () => {
    render(<WeatherDisplay loading={true} />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  test('handles error state', () => {
    const error = 'Failed to fetch weather data';
    render(<WeatherDisplay error={error} />);
    expect(screen.getByText(error)).toBeInTheDocument();
  });
});
```

#### API Tests
```javascript
// api.test.js
import { fetchWeatherData } from './api';

// Mock fetch
global.fetch = jest.fn();

describe('API functions', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('fetchWeatherData returns data on success', async () => {
    const mockData = { icao: 'KJFK', temperature: 22 };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    const result = await fetchWeatherData('KJFK');
    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledWith('/api/weather/KJFK');
  });

  test('fetchWeatherData throws on error', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    await expect(fetchWeatherData('INVALID'))
      .rejects.toThrow('HTTP 404: Not Found');
  });
});
```

### Backend Testing (Node.js + Jest)

#### Controller Tests
```javascript
// weatherController.test.js
const request = require('supertest');
const app = require('../app');
const weatherService = require('../services/weatherService');

jest.mock('../services/weatherService');

describe('Weather Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/weather/:icao', () => {
    test('returns weather data for valid ICAO', async () => {
      const mockData = { icao: 'KJFK', temperature: 22 };
      weatherService.getCurrentWeather.mockResolvedValue(mockData);

      const response = await request(app)
        .get('/api/weather/KJFK')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockData);
    });

    test('returns 400 for invalid ICAO', async () => {
      const response = await request(app)
        .get('/api/weather/INVALID123')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/invalid icao/i);
    });

    test('handles service errors gracefully', async () => {
      weatherService.getCurrentWeather.mockRejectedValue(
        new Error('Service unavailable')
      );

      const response = await request(app)
        .get('/api/weather/KJFK')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});
```

### Python Testing (pytest)

#### Unit Tests
```python
# test_weather_processor.py
import pytest
from unittest.mock import Mock, AsyncMock
from nlp.weather_processor import WeatherProcessor

class TestWeatherProcessor:
    @pytest.fixture
    def processor(self):
        return WeatherProcessor(api_key="test_key")
    
    @pytest.mark.asyncio
    async def test_analyze_conditions_success(self, processor):
        """Test successful weather analysis."""
        metar = "KJFK 271851Z 28014KT 10SM FEW250 24/18 A3012"
        
        # Mock OpenAI response
        processor._client.chat.completions.create = AsyncMock(
            return_value=Mock(
                choices=[Mock(
                    message=Mock(content='{"severity": "low", "recommendation": "Good for VFR"}')
                )]
            )
        )
        
        result = await processor.analyze_conditions(metar)
        
        assert result["severity"] == "low"
        assert "VFR" in result["recommendation"]
    
    def test_parse_visibility_valid(self, processor):
        """Test visibility parsing with valid input."""
        assert processor._parse_visibility("10SM") == 10.0
        assert processor._parse_visibility("1/2SM") == 0.5
        assert processor._parse_visibility("M1/4SM") == 0.25
    
    def test_parse_visibility_invalid(self, processor):
        """Test visibility parsing with invalid input."""
        with pytest.raises(ValueError):
            processor._parse_visibility("invalid")

# Test configuration
@pytest.fixture
def mock_openai_client():
    """Mock OpenAI client for testing."""
    return Mock()

# Run tests with coverage
# pytest --cov=nlp tests/ --cov-report=html
```

### Integration Tests

#### End-to-End Tests
```javascript
// e2e/weather-flow.test.js
const { chromium } = require('playwright');

describe('Weather Flow E2E', () => {
  let browser, page;

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto('http://localhost:5173');
  });

  test('complete weather briefing flow', async () => {
    // Enter ICAO code
    await page.fill('[data-testid="departure-input"]', 'KJFK');
    
    // Submit form
    await page.click('[data-testid="get-weather-button"]');
    
    // Wait for results
    await page.waitForSelector('[data-testid="weather-results"]');
    
    // Verify METAR tab is active
    expect(await page.isVisible('[data-testid="metar-content"]')).toBe(true);
    
    // Switch to TAF tab
    await page.click('[data-testid="taf-tab"]');
    await page.waitForSelector('[data-testid="taf-content"]');
    
    // Switch to AI analysis
    await page.click('[data-testid="ai-tab"]');
    await page.waitForSelector('[data-testid="ai-content"]');
    
    // Verify AI content exists
    const aiContent = await page.textContent('[data-testid="ai-content"]');
    expect(aiContent).toContain('analysis');
  });
});
```

---

## 🔄 Git Workflow

### Branch Naming Convention
```
feature/weather-alerts        # New features
bugfix/api-timeout-handling  # Bug fixes
hotfix/security-vulnerability # Critical fixes
refactor/component-structure # Code refactoring
docs/api-documentation       # Documentation updates
```

### Commit Message Format
```
type(scope): brief description

Optional longer description explaining the change

Closes #123
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Build process or auxiliary tool changes

**Examples:**
```
feat(weather): add severe weather alerts

Add real-time severe weather alert processing with automatic
notifications for thunderstorms, icing, and turbulence warnings.

Closes #45

fix(api): handle timeout errors gracefully

Implement retry logic and fallback mechanisms for external API
calls to improve reliability during network issues.

Fixes #78
```

### Pull Request Process

#### 1. Before Creating PR
```bash
# Ensure you're on latest main
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Make your changes and commit
git add .
git commit -m "feat(component): add new feature"

# Push to your fork
git push origin feature/your-feature-name
```

#### 2. PR Checklist
- [ ] **Tests**: All new code has appropriate tests
- [ ] **Documentation**: README and docs updated if needed
- [ ] **Linting**: Code passes all linting checks
- [ ] **No merge conflicts**: Branch is up to date with main
- [ ] **Self-review**: Code has been self-reviewed
- [ ] **Breaking changes**: Documented if any

#### 3. PR Template
```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that causes existing functionality to change)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
```

---

## 🏛️ Architecture Guidelines

### Component Design Principles

#### 1. Single Responsibility
```javascript
// Good: Component has single responsibility
const WeatherDisplay = ({ weather }) => {
  return (
    <div className="weather-display">
      <h2>{weather.icao}</h2>
      <p>{weather.conditions}</p>
    </div>
  );
};

// Bad: Component does too much
const WeatherDisplayAndForm = ({ weather, onSubmit }) => {
  // Mixing display and form logic
};
```

#### 2. Composition over Inheritance
```javascript
// Good: Composition pattern
const WeatherDashboard = () => {
  return (
    <Dashboard>
      <WeatherDisplay weather={weather} />
      <WeatherForm onSubmit={handleSubmit} />
      <WeatherMap airports={airports} />
    </Dashboard>
  );
};
```

#### 3. Props Drilling Avoidance
```javascript
// Use Context for deeply nested props
const WeatherContext = React.createContext();

const WeatherProvider = ({ children }) => {
  const [weather, setWeather] = useState(null);
  
  return (
    <WeatherContext.Provider value={{ weather, setWeather }}>
      {children}
    </WeatherContext.Provider>
  );
};

// Custom hook for consuming context
const useWeather = () => {
  const context = useContext(WeatherContext);
  if (!context) {
    throw new Error('useWeather must be used within WeatherProvider');
  }
  return context;
};
```

### API Design Principles

#### 1. RESTful Design
```javascript
// Good: RESTful endpoints
GET    /api/weather/:icao           // Get current weather
GET    /api/weather/:icao/forecast  // Get forecast
POST   /api/weather/briefing        // Create briefing
GET    /api/airports/:icao/notams   // Get NOTAMs

// Bad: Non-RESTful
GET    /api/getWeather?code=KJFK
POST   /api/createWeatherBriefing
```

#### 2. Consistent Response Format
```javascript
// Success response
{
  "success": true,
  "data": {
    "icao": "KJFK",
    "temperature": 22
  },
  "timestamp": "2023-09-27T10:30:00Z"
}

// Error response
{
  "success": false,
  "error": {
    "code": "INVALID_ICAO",
    "message": "Invalid ICAO code provided",
    "details": "ICAO codes must be exactly 4 characters"
  },
  "timestamp": "2023-09-27T10:30:00Z"
}
```

#### 3. Proper HTTP Status Codes
```javascript
// Use appropriate status codes
app.get('/api/weather/:icao', async (req, res) => {
  try {
    const weather = await getWeatherData(req.params.icao);
    res.status(200).json({ success: true, data: weather });
  } catch (error) {
    if (error.type === 'VALIDATION_ERROR') {
      res.status(400).json({ success: false, error: error.message });
    } else if (error.type === 'NOT_FOUND') {
      res.status(404).json({ success: false, error: 'Airport not found' });
    } else {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
});
```

### State Management

#### 1. Local State (useState)
```javascript
// Use for component-specific state
const WeatherForm = () => {
  const [icaoCode, setIcaoCode] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Component logic
};
```

#### 2. Context State (useContext)
```javascript
// Use for state shared across components
const WeatherProvider = ({ children }) => {
  const [currentWeather, setCurrentWeather] = useState(null);
  const [favorites, setFavorites] = useState([]);
  
  return (
    <WeatherContext.Provider value={{ 
      currentWeather, 
      setCurrentWeather,
      favorites,
      setFavorites 
    }}>
      {children}
    </WeatherContext.Provider>
  );
};
```

#### 3. Server State (React Query - if implemented)
```javascript
// For server data caching and synchronization
const useWeatherData = (icaoCode) => {
  return useQuery({
    queryKey: ['weather', icaoCode],
    queryFn: () => fetchWeatherData(icaoCode),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};
```

### Error Handling Strategy

#### 1. Frontend Error Boundaries
```javascript
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>We're sorry for the inconvenience. Please try refreshing the page.</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### 2. API Error Handling
```javascript
// Centralized error handling
class APIError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const handleAPIError = (error, response) => {
  if (response.status === 400) {
    throw new APIError(400, 'Invalid request', response.data.details);
  } else if (response.status === 404) {
    throw new APIError(404, 'Resource not found');
  } else if (response.status >= 500) {
    throw new APIError(500, 'Server error');
  }
  throw new APIError(response.status, 'Unknown error');
};
```

---

## 🚀 Performance Guidelines

### Frontend Performance

#### 1. Code Splitting
```javascript
// Lazy load components
const MapView = React.lazy(() => import('./components/MapView'));
const WeatherChart = React.lazy(() => import('./components/WeatherChart'));

const App = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/map" element={<MapView />} />
        <Route path="/chart" element={<WeatherChart />} />
      </Routes>
    </Suspense>
  );
};
```

#### 2. Memoization
```javascript
// Memoize expensive components
const WeatherDisplay = React.memo(({ weather, options }) => {
  const processedData = useMemo(() => {
    return processWeatherData(weather, options);
  }, [weather, options]);
  
  return <div>{/* Component JSX */}</div>;
});

// Memoize event handlers
const WeatherForm = () => {
  const handleSubmit = useCallback((formData) => {
    // Handle submission
  }, []);
  
  return <form onSubmit={handleSubmit}>{/* Form JSX */}</form>;
};
```

#### 3. Debouncing User Input
```javascript
// Debounce search input
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const SearchInput = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (debouncedSearchTerm) {
      searchAirports(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  return (
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search airports..."
    />
  );
};
```

### Backend Performance

#### 1. Caching Strategy
```javascript
// Memory cache for frequently accessed data
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes

const getCachedWeatherData = async (icaoCode) => {
  const cacheKey = `weather_${icaoCode}`;
  
  // Check cache first
  let weatherData = cache.get(cacheKey);
  
  if (!weatherData) {
    // Fetch from external API
    weatherData = await fetchFromExternalAPI(icaoCode);
    
    // Cache the result
    cache.set(cacheKey, weatherData);
  }
  
  return weatherData;
};
```

#### 2. Database Query Optimization
```javascript
// Use indexes and efficient queries
const getWeatherHistory = async (icaoCode, days = 7) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Efficient query with index on icao_code and timestamp
  return await WeatherHistory.find({
    icao_code: icaoCode,
    timestamp: { $gte: startDate }
  })
  .select('temperature visibility conditions timestamp')
  .sort({ timestamp: -1 })
  .limit(100);
};
```

#### 3. Async Processing
```javascript
// Use async/await and parallel processing
const getComprehensiveBriefing = async (icaoCodes) => {
  try {
    // Process multiple airports in parallel
    const weatherPromises = icaoCodes.map(code => 
      getCachedWeatherData(code)
    );
    
    const weatherData = await Promise.all(weatherPromises);
    
    // Process AI analysis in parallel
    const analysisPromises = weatherData.map(data =>
      processWithAI(data)
    );
    
    const analyses = await Promise.all(analysisPromises);
    
    return {
      weather: weatherData,
      analyses: analyses,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Briefing generation failed:', error);
    throw new Error('Failed to generate comprehensive briefing');
  }
};
```

---

## 🔐 Security Guidelines

### Frontend Security

#### 1. Input Validation
```javascript
// Validate ICAO codes client-side
const validateICAO = (code) => {
  const icaoRegex = /^[A-Z]{4}$/;
  
  if (!code) {
    throw new Error('ICAO code is required');
  }
  
  if (!icaoRegex.test(code)) {
    throw new Error('ICAO code must be exactly 4 uppercase letters');
  }
  
  return code;
};

// Sanitize user input
const sanitizeInput = (input) => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS characters
    .substring(0, 10); // Limit length
};
```

#### 2. Secure API Communication
```javascript
// Use HTTPS and proper headers
const apiClient = axios.create({
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://api.aviationweather.com'
    : 'http://localhost:5000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

// Handle sensitive data
const handleAPIKey = (key) => {
  // Never log API keys
  if (process.env.NODE_ENV === 'development') {
    console.log('API key provided:', key ? 'YES' : 'NO');
  }
  return key;
};
```

### Backend Security

#### 1. Environment Variables
```javascript
// Proper environment variable handling
require('dotenv').config();

const config = {
  port: process.env.PORT || 5000,
  checkwxApiKey: process.env.CHECKWX_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  corsOrigin: process.env.NODE_ENV === 'production' 
    ? 'https://aviationweather.app'
    : 'http://localhost:5173'
};

// Validate required environment variables
const requiredEnvVars = ['CHECKWX_API_KEY', 'OPENAI_API_KEY'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Required environment variable ${envVar} is not set`);
  }
}
```

#### 2. Input Sanitization and Validation
```javascript
const joi = require('joi');

// Define validation schemas
const weatherRequestSchema = joi.object({
  icao: joi.string()
    .length(4)
    .pattern(/^[A-Z]{4}$/)
    .required()
    .messages({
      'string.length': 'ICAO code must be exactly 4 characters',
      'string.pattern.base': 'ICAO code must contain only uppercase letters'
    }),
  includeForecast: joi.boolean().default(true)
});

// Validation middleware
const validateWeatherRequest = (req, res, next) => {
  const { error, value } = weatherRequestSchema.validate(req.params);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.details[0].message
      }
    });
  }
  
  req.params = value;
  next();
};
```

#### 3. Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

// Create rate limiter
const weatherApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply to routes
app.use('/api/weather', weatherApiLimiter);
```

---

## 📚 Additional Resources

### Learning Resources

#### React/JavaScript
- [React Official Documentation](https://reactjs.org/docs/)
- [JavaScript.info](https://javascript.info/)
- [MDN Web Docs](https://developer.mozilla.org/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

#### Node.js/Express
- [Node.js Documentation](https://nodejs.org/en/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

#### Python/FastAPI
- [Python Official Documentation](https://docs.python.org/3/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [pytest Documentation](https://docs.pytest.org/)

#### Aviation Weather
- [Aviation Weather Center](https://www.aviationweather.gov/)
- [ICAO Weather Codes](https://www.weather.gov/media/wrh/mesowest/metar_decode_key.pdf)
- [TAF Format Guide](https://www.aviationweather.gov/taf/decoder)

### Development Tools

#### VS Code Settings
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact"
  ],
  "python.defaultInterpreterPath": "./backend-python-nlp/venv/bin/python",
  "python.formatting.provider": "black",
  "python.linting.enabled": true,
  "python.linting.flake8Enabled": true
}
```

#### Package.json Scripts
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\" \"npm run dev:nlp\"",
    "dev:frontend": "cd frontend-react && npm run dev",
    "dev:backend": "cd backend-node && npm run dev",
    "dev:nlp": "cd backend-python-nlp && python app.py",
    "test": "npm run test:frontend && npm run test:backend && npm run test:nlp",
    "test:frontend": "cd frontend-react && npm test",
    "test:backend": "cd backend-node && npm test",
    "test:nlp": "cd backend-python-nlp && python -m pytest",
    "lint": "npm run lint:frontend && npm run lint:backend",
    "lint:frontend": "cd frontend-react && npm run lint",
    "lint:backend": "cd backend-node && npm run lint"
  }
}
```

### Community

#### Communication Channels
- **Slack/Discord**: Project team communication
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General discussion and Q&A
- **Weekly Standups**: Progress updates and coordination

#### Contribution Process
1. **Check existing issues** before creating new ones
2. **Discuss major changes** in GitHub discussions first
3. **Follow the PR process** outlined above
4. **Be respectful** and constructive in code reviews
5. **Help others** by reviewing their PRs and answering questions

---

## 🤝 Getting Help

### Internal Resources
1. **Project Documentation**: Check existing docs first
2. **Code Comments**: Most complex logic is documented
3. **Git History**: See how similar problems were solved
4. **Team Members**: Reach out to specific expertise areas

### External Resources
1. **Stack Overflow**: For general programming questions
2. **GitHub Issues**: For library-specific problems
3. **Official Documentation**: Always check the source
4. **Developer Communities**: Reddit, Discord, forums

### Debugging Process
1. **Reproduce the issue** consistently
2. **Check browser/server logs** for error messages
3. **Use debugging tools** (React DevTools, Node debugger, pdb)
4. **Isolate the problem** to specific components/functions
5. **Write a test case** that demonstrates the issue
6. **Document your findings** for others

---

## 📋 Onboarding Checklist

### New Developer Setup
- [ ] **Repository cloned** and remotes configured
- [ ] **Development environment** set up and tested
- [ ] **All services running** locally
- [ ] **Tests passing** on your machine
- [ ] **Code editor configured** with recommended extensions
- [ ] **Team communication** channels joined
- [ ] **First contribution** planned and discussed

### First Week Goals
- [ ] **Read all documentation** in `/docs` folder
- [ ] **Complete a small bug fix** or documentation improvement
- [ ] **Attend team meetings** and introduce yourself
- [ ] **Set up development workflow** with linting and testing
- [ ] **Understand the codebase** structure and conventions
- [ ] **Identify areas for improvement** and discuss with team

### First Month Objectives
- [ ] **Complete first feature** implementation
- [ ] **Write comprehensive tests** for your contributions
- [ ] **Participate in code reviews** for other team members
- [ ] **Improve documentation** based on your onboarding experience
- [ ] **Identify and implement** performance improvements
- [ ] **Become familiar** with deployment process

---

**Welcome to the team! 🎉**

*Remember: Great code is not just about functionality - it's about clarity, maintainability, and helping your fellow developers understand and extend your work. When in doubt, prioritize readability and ask for help!*

---

*Developer Guide last updated: September 27, 2025*