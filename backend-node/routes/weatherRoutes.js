const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');
const apiFetcher = require('../utils/apiFetcher');

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

// Debug TAF fetching - TEST ENDPOINT
// GET /api/weather/debug/taf/:icao
router.get('/debug/taf/:icao', async (req, res) => {
  const { icao } = req.params;
  
  try {
    console.log(`\n🔍 DEBUG TAF FETCHING ENDPOINT CALLED FOR: ${icao}`);
    await apiFetcher.debugTafFetching(icao.toUpperCase());
    
    // Also test the main getLatestTaf function
    console.log('\n🧪 Testing main getLatestTaf function...');
    const tafResult = await apiFetcher.getLatestTaf(icao.toUpperCase());
    
    res.json({
      success: true,
      message: 'TAF debug completed - check server logs',
      icao: icao.toUpperCase(),
      result: tafResult
    });
  } catch (error) {
    console.error('Debug TAF endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      icao: icao.toUpperCase()
    });
  }
});

module.exports = router;