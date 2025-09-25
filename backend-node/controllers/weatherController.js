const metarDecoder = require('../utils/metarDecoder');
const tafDecoder = require('../utils/tafDecoder');
const apiFetcher = require('../utils/apiFetcher');
const severityClassifier = require('../utils/severityClassifier');

// Decode METAR data to human-readable format
const decodeMetar = async (req, res) => {
  try {
    const { metarString, icao } = req.body;

    if (!metarString) {
      return res.status(400).json({
        error: 'METAR string is required',
        example: 'KJFK 121851Z 24016G24KT 10SM BKN250 22/13 A3000 RMK AO2'
      });
    }

    const decoded = metarDecoder.decode(metarString);
    const severity = severityClassifier.classifyWeatherConditions(decoded);

    res.json({
      success: true,
      raw: metarString,
      decoded,
      severity,
      humanReadable: metarDecoder.toHumanReadable(decoded),
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('METAR decode error:', error);
    res.status(400).json({
      error: 'Failed to decode METAR',
      message: error.message,
      input: req.body.metarString
    });
  }
};

// Decode TAF data to human-readable format
const decodeTaf = async (req, res) => {
  try {
    const { tafString, icao } = req.body;

    if (!tafString) {
      return res.status(400).json({
        error: 'TAF string is required',
        example: 'TAF KJFK 121720Z 1218/1324 24015G25KT P6SM BKN200'
      });
    }

    const decoded = tafDecoder.decode(tafString);
    const forecastSeverity = severityClassifier.classifyForecast(decoded);

    res.json({
      success: true,
      raw: tafString,
      decoded,
      forecastPeriods: decoded.periods,
      severity: forecastSeverity,
      humanReadable: tafDecoder.toHumanReadable(decoded),
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('TAF decode error:', error);
    res.status(400).json({
      error: 'Failed to decode TAF',
      message: error.message,
      input: req.body.tafString
    });
  }
};

// Get current weather for specific airport
const getCurrentWeather = async (req, res) => {
  try {
    const { icao } = req.params;

    if (!icao || icao.length !== 4) {
      return res.status(400).json({
        error: 'Valid 4-letter ICAO airport code is required',
        example: 'KJFK'
      });
    }

    // Fetch live METAR data
    const metarData = await apiFetcher.getLatestMetar(icao.toUpperCase());
    
    if (!metarData) {
      return res.status(404).json({
        error: 'No weather data found for airport',
        icao: icao.toUpperCase()
      });
    }

    const decoded = metarDecoder.decode(metarData.raw);
    const severity = severityClassifier.classifyWeatherConditions(decoded);

    res.json({
      success: true,
      airport: icao.toUpperCase(),
      current: {
        raw: metarData.raw,
        decoded,
        severity,
        humanReadable: metarDecoder.toHumanReadable(decoded),
        observedAt: metarData.observationTime
      },
      fetchedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Current weather error:', error);
    res.status(500).json({
      error: 'Failed to fetch current weather',
      message: error.message,
      icao: req.params.icao
    });
  }
};

// Get weather forecast for specific airport
const getWeatherForecast = async (req, res) => {
  try {
    const { icao } = req.params;
    const { hours = 24 } = req.query;

    if (!icao || icao.length !== 4) {
      return res.status(400).json({
        error: 'Valid 4-letter ICAO airport code is required',
        example: 'KJFK'
      });
    }

    // Fetch live TAF data
    const tafData = await apiFetcher.getLatestTaf(icao.toUpperCase());
    
    if (!tafData) {
      return res.status(404).json({
        error: 'No forecast data found for airport',
        icao: icao.toUpperCase()
      });
    }

    const decoded = tafDecoder.decode(tafData.raw);
    const forecastSeverity = severityClassifier.classifyForecast(decoded);

    // Filter forecast periods by requested hours
    const filteredPeriods = decoded.periods.filter(period => {
      const periodHours = (new Date(period.validTo) - new Date()) / (1000 * 60 * 60);
      return periodHours <= hours;
    });

    res.json({
      success: true,
      airport: icao.toUpperCase(),
      forecast: {
        raw: tafData.raw,
        decoded,
        periods: filteredPeriods,
        severity: forecastSeverity,
        humanReadable: tafDecoder.toHumanReadable(decoded),
        issuedAt: tafData.issueTime,
        validPeriod: decoded.validPeriod
      },
      fetchedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Weather forecast error:', error);
    res.status(500).json({
      error: 'Failed to fetch weather forecast',
      message: error.message,
      icao: req.params.icao
    });
  }
};

// Get comprehensive weather briefing for multiple airports
const getWeatherBriefing = async (req, res) => {
  try {
    const { airports, includeForecasts = true } = req.body;

    if (!airports || !Array.isArray(airports) || airports.length === 0) {
      return res.status(400).json({
        error: 'Array of airport ICAO codes is required',
        example: ['KJFK', 'KLGA', 'KEWR']
      });
    }

    const briefing = {
      airports: [],
      summary: '',
      overallConditions: 'CLEAR',
      alerts: [],
      generatedAt: new Date().toISOString()
    };

    // Process each airport
    for (const icao of airports) {
      try {
        const airportCode = icao.toUpperCase();
        const airportData = {
          icao: airportCode,
          current: null,
          forecast: null,
          severity: 'CLEAR',
          alerts: []
        };

        // Get current weather
        const metarData = await apiFetcher.getLatestMetar(airportCode);
        if (metarData) {
          const decoded = metarDecoder.decode(metarData.raw);
          airportData.current = {
            raw: metarData.raw,
            decoded,
            humanReadable: metarDecoder.toHumanReadable(decoded),
            observedAt: metarData.observationTime
          };
          airportData.severity = severityClassifier.classifyWeatherConditions(decoded);
        }

        // Get forecast if requested
        if (includeForecasts) {
          const tafData = await apiFetcher.getLatestTaf(airportCode);
          if (tafData) {
            const decoded = tafDecoder.decode(tafData.raw);
            airportData.forecast = {
              raw: tafData.raw,
              decoded,
              humanReadable: tafDecoder.toHumanReadable(decoded),
              issuedAt: tafData.issueTime
            };
            
            const forecastSeverity = severityClassifier.classifyForecast(decoded);
            if (severityClassifier.compareSeverity(forecastSeverity, airportData.severity) > 0) {
              airportData.severity = forecastSeverity;
            }
          }
        }

        // Generate airport-specific alerts
        if (airportData.severity === 'SEVERE') {
          airportData.alerts.push({
            type: 'SEVERE_WEATHER',
            message: `Severe weather conditions at ${airportCode}`,
            priority: 'HIGH'
          });
          briefing.alerts.push(`⚠️ SEVERE weather at ${airportCode}`);
        } else if (airportData.severity === 'SIGNIFICANT') {
          airportData.alerts.push({
            type: 'SIGNIFICANT_WEATHER',
            message: `Significant weather conditions at ${airportCode}`,
            priority: 'MEDIUM'
          });
          briefing.alerts.push(`⚡ SIGNIFICANT weather at ${airportCode}`);
        }

        briefing.airports.push(airportData);

      } catch (airportError) {
        console.error(`Error processing ${icao}:`, airportError);
        briefing.airports.push({
          icao: icao.toUpperCase(),
          error: `Failed to fetch weather data: ${airportError.message}`,
          severity: 'UNKNOWN'
        });
      }
    }

    // Determine overall conditions
    const severities = briefing.airports.map(a => a.severity).filter(s => s !== 'UNKNOWN');
    briefing.overallConditions = severityClassifier.getOverallSeverity(severities);

    // Generate summary
    briefing.summary = generateWeatherSummary(briefing.airports, briefing.overallConditions);

    res.json({
      success: true,
      briefing
    });

  } catch (error) {
    console.error('Weather briefing error:', error);
    res.status(500).json({
      error: 'Failed to generate weather briefing',
      message: error.message
    });
  }
};

// Helper function to generate weather summary
function generateWeatherSummary(airports, overallConditions) {
  const validAirports = airports.filter(a => !a.error);
  const severeCount = validAirports.filter(a => a.severity === 'SEVERE').length;
  const significantCount = validAirports.filter(a => a.severity === 'SIGNIFICANT').length;
  
  let summary = `Weather briefing for ${airports.length} airport(s). `;
  
  if (overallConditions === 'SEVERE') {
    summary += `⚠️ SEVERE conditions detected at ${severeCount} airport(s). Flight operations may be significantly impacted.`;
  } else if (overallConditions === 'SIGNIFICANT') {
    summary += `⚡ SIGNIFICANT conditions at ${significantCount} airport(s). Monitor closely and be prepared for possible delays.`;
  } else {
    summary += `🌤️ Generally favorable conditions across all airports. Normal flight operations expected.`;
  }
  
  return summary;
}

module.exports = {
  decodeMetar,
  decodeTaf,
  getCurrentWeather,
  getWeatherForecast,
  getWeatherBriefing
};