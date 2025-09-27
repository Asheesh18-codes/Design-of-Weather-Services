const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes
const weatherRoutes = require('./routes/weatherRoutes');
const flightPlanRoutes = require('./routes/flightPlanRoutes');
const notamRoutes = require('./routes/notamRoutes');
const airportRoutes = require('./routes/airportRoutes');
const severityController = require('./controllers/severityController');
const apiFetcher = require('./utils/apiFetcher');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000', // React dev server
    'http://localhost:5173', // Vite dev server
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Aviation Weather Briefing API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      weather: '/api/weather',
      flightPlan: '/api/flightplan',
      notam: '/api/notam',
      airports: '/api/airports',
      severity: '/api/severity',
      health: '/api/health'
    }
  });
});

// Detailed health check endpoint
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      primary_weather_api: 'unknown',
      checkwx_backup_api: 'unknown',
      python_nlp_service: process.env.PYTHON_NLP_URL || 'not configured'
    }
  };

  // Test CheckWX backup API
  try {
    const checkwxStatus = await apiFetcher.testCheckWXConnection();
    health.services.checkwx_backup_api = checkwxStatus ? 'available' : 'unavailable';
  } catch (error) {
    health.services.checkwx_backup_api = 'error: ' + error.message;
  }

  res.json(health);
});

// API Routes
app.use('/api/weather', weatherRoutes);
app.use('/api/flightplan', flightPlanRoutes);
app.use('/api/notam', notamRoutes);
app.use('/api/airports', airportRoutes);

// Add severity classification endpoints
app.post('/api/severity/classify', severityController.classifyWeather);
app.post('/api/severity/route', severityController.classifyRoute);
app.get('/api/severity/info', severityController.getSeverityInfo);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    availableRoutes: ['/api/weather', '/api/flightplan', '/api/notam', '/api/airports', '/api/severity']
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🛫 Aviation Weather Briefing API running on port ${PORT}`);
  console.log(`📡 Server started at: http://localhost:${PORT}`);
  console.log(`🌤️  Weather endpoint: http://localhost:${PORT}/api/weather`);
  console.log(`✈️  Flight plan endpoint: http://localhost:${PORT}/api/flightplan`);
  console.log(`📋 NOTAM endpoint: http://localhost:${PORT}/api/notam`);
  console.log(`🛩️  Airport database: http://localhost:${PORT}/api/airports`);
  console.log(`⚡ Severity endpoint: http://localhost:${PORT}/api/severity`);
  
  // Test backup API connections
  console.log('\n🔧 Testing backup API connections...');
  await apiFetcher.testCheckWXConnection();
});

module.exports = app;