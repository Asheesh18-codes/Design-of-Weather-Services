const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');

// Decode METAR data
// POST /api/weather/metar
router.post('/metar', weatherController.decodeMetar);

// Decode TAF data  
// POST /api/weather/taf
router.post('/taf', weatherController.decodeTaf);

// Get current weather for airport
// GET /api/weather/current/:icao
router.get('/current/:icao', weatherController.getCurrentWeather);

// Get weather forecast for airport
// GET /api/weather/forecast/:icao
router.get('/forecast/:icao', weatherController.getWeatherForecast);

// Get weather briefing for multiple airports
// POST /api/weather/briefing
router.post('/briefing', weatherController.getWeatherBriefing);

module.exports = router;