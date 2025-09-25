const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes
const weatherRoutes = require('./routes/weatherRoutes');
const flightPlanRoutes = require('./routes/flightPlanRoutes');
const notamRoutes = require('./routes/notamRoutes');
const severityController = require('./controllers/severityController');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
      severity: '/api/severity'
    }
  });
});

// API Routes
app.use('/api/weather', weatherRoutes);
app.use('/api/flightplan', flightPlanRoutes);
app.use('/api/notam', notamRoutes);

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
    availableRoutes: ['/api/weather', '/api/flightplan', '/api/notam', '/api/severity']
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🛫 Aviation Weather Briefing API running on port ${PORT}`);
  console.log(`📡 Server started at: http://localhost:${PORT}`);
  console.log(`🌤️  Weather endpoint: http://localhost:${PORT}/api/weather`);
  console.log(`✈️  Flight plan endpoint: http://localhost:${PORT}/api/flightplan`);
  console.log(`📋 NOTAM endpoint: http://localhost:${PORT}/api/notam`);
  console.log(`⚡ Severity endpoint: http://localhost:${PORT}/api/severity`);
});

module.exports = app;