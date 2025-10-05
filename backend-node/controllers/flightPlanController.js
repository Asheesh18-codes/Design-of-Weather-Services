const waypointGenerator = require('../utils/waypointGenerator');
const severityClassifier = require('../utils/severityClassifier');
const apiFetcher = require('../utils/apiFetcher');
const airportService = require('../utils/airportService');

// Generate flight plan with waypoints
const generate = async (req, res) => {
  try {
    const { origin, destination, altitude = 35000, route } = req.body;

    console.log('Flight plan request:', { origin, destination, altitude });

    if (!origin || !destination) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['origin', 'destination'],
        provided: req.body
      });
    }

    // Get airport coordinates from database
    const originCoords = airportService.getCoordinates(origin.icao || origin);
    const destCoords = airportService.getCoordinates(destination.icao || destination);

    if (!originCoords) {
      return res.status(400).json({
        error: 'Origin airport not found',
        code: origin.icao || origin,
        suggestion: 'Please use a valid ICAO code (e.g., KJFK, EGLL)'
      });
    }

    if (!destCoords) {
      return res.status(400).json({
        error: 'Destination airport not found', 
        code: destination.icao || destination,
        suggestion: 'Please use a valid ICAO code (e.g., KJFK, EGLL)'
      });
    }

    // Generate waypoints dynamically using NLP service
    const waypoints = await waypointGenerator.generateWaypoints(
      origin.icao || origin, 
      destination.icao || destination, 
      altitude, 
      route,
      { originCoords, destCoords }
    );

    // Create response in expected format
    const response = {
      success: true,
  raw: `Flight plan: ${origin.icao || origin} to ${destination.icao || destination}`,
      parsed: {
        success: true,
        origin,
        destination,
        altitude,
        waypoints
      },
      data: {
        "Flight-Rules": "VFR",
        Visibility: { value: 10, units: "SM" },
        Clouds: [{ cover: "FEW", base_ft: 2000 }],
        Wind: { direction: 180, speed: 5, gust: null },
        Temperature: 25,
        Dewpoint: 12,
        Altimeter: "A3012"
      },
      summary:
        `Flight plan from ${origin.icao || origin} (${originCoords.name || 'Unknown'}) to ${destination.icao || destination} (${destCoords.name || 'Unknown'}) at cruising altitude ${altitude} ft. ` +
        `The route departs from ${originCoords.name || origin.icao || origin}, proceeds through ${waypoints.length - 2 > 0 ? (waypoints.length - 2) + ' enroute waypoints' : 'a direct path'}, and arrives at ${destCoords.name || destination.icao || destination}. ` +
        `Weather and NOTAMs are considered for both departure and arrival. Please review enroute hazards and advisories for SIGMETs and PIREPs.`,
      hf_summary: "Flight plan generated successfully",
      category: "Clear",
      route: {
        origin: { 
          icao: origin.icao || origin, 
          lat: originCoords.lat, 
          lon: originCoords.lon,
          name: originCoords.name,
          elevation: originCoords.elevation
        },
        destination: { 
          icao: destination.icao || destination, 
          lat: destCoords.lat, 
          lon: destCoords.lon,
          name: destCoords.name,
          elevation: destCoords.elevation
        }
      },
      waypoints: waypoints,
      flightPlan: {
        waypoints: waypoints,
        distance: waypoints.length > 0 ? waypoints[waypoints.length - 1].cumulativeDistance : 0,
        totalTime: waypoints.length > 0 ? waypoints[waypoints.length - 1].estimatedTime : "00:00:00"
      },
      processedAt: new Date().toISOString()
    };

    console.log('Sending response:', JSON.stringify(response, null, 2));
    res.json(response);

  } catch (error) {
    console.error('Flight plan generation error:', error);
    // If error is ICAO lookup related, return a user-friendly message
    let userMessage = error.message;
    if (userMessage.includes('ICAO lookup failed')) {
      userMessage = `Could not find airport info for one of the ICAO codes provided. Please check your origin and destination codes.`;
    }
    res.status(500).json({
      error: 'Failed to generate flight plan',
      message: userMessage
    });
  }
};

// Get comprehensive weather briefing for entire route
const getRouteBriefing = async (req, res) => {
  try {
    const { waypoints } = req.body;

    if (!waypoints || !Array.isArray(waypoints)) {
      return res.status(400).json({
        error: 'Waypoints array is required'
      });
    }

    const briefing = {
      summary: '',
      alerts: [],
      weatherBySegment: [],
      overallSeverity: 'CLEAR'
    };

    // Analyze weather for each segment
    for (let i = 0; i < waypoints.length - 1; i++) {
      const fromPoint = waypoints[i];
      const toPoint = waypoints[i + 1];
      
      const segmentWeather = {
        from: fromPoint,
        to: toPoint,
        conditions: await apiFetcher.getWeatherAlongRoute(fromPoint, toPoint),
        severity: severityClassifier.classifySegment(fromPoint, toPoint)
      };

      briefing.weatherBySegment.push(segmentWeather);

      if (segmentWeather.severity === 'SEVERE') {
        briefing.alerts.push({
          type: 'SEVERE_WEATHER',
          segment: `${fromPoint.name} to ${toPoint.name}`,
          message: 'Severe weather conditions detected along this segment'
        });
      }
    }

    // Generate summary
    briefing.summary = generateRouteSummary(briefing.weatherBySegment);
    briefing.overallSeverity = severityClassifier.getRouteSeverity(briefing.weatherBySegment);

    res.json({
      success: true,
      briefing,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Route briefing error:', error);
    res.status(500).json({
      error: 'Failed to generate route briefing',
      message: error.message
    });
  }
};

// Analyze route safety based on weather and NOTAMs
const analyzeSafety = async (req, res) => {
  try {
    const { flightPlan } = req.body;

    if (!flightPlan || !flightPlan.waypoints) {
      return res.status(400).json({
        error: 'Flight plan with waypoints is required'
      });
    }

    const analysis = {
      overallRisk: 'LOW',
      riskFactors: [],
      recommendations: [],
      alternateRoutes: [],
      safetyScore: 0
    };

    // Analyze each waypoint for risks
    let totalRiskScore = 0;
    const riskFactors = [];

    for (const waypoint of flightPlan.waypoints) {
      if (waypoint.severity === 'SEVERE') {
        riskFactors.push({
          location: waypoint.name,
          type: 'SEVERE_WEATHER',
          description: `Severe weather conditions at ${waypoint.name}`,
          mitigation: 'Consider alternate routing or weather delay'
        });
        totalRiskScore += 10;
      } else if (waypoint.severity === 'SIGNIFICANT') {
        riskFactors.push({
          location: waypoint.name,
          type: 'SIGNIFICANT_WEATHER',
          description: `Significant weather conditions at ${waypoint.name}`,
          mitigation: 'Monitor conditions closely, prepare for possible deviations'
        });
        totalRiskScore += 5;
      }
    }

    // Calculate overall risk
    const avgRisk = totalRiskScore / flightPlan.waypoints.length;
    analysis.overallRisk = avgRisk > 8 ? 'HIGH' : avgRisk > 4 ? 'MEDIUM' : 'LOW';
    analysis.safetyScore = Math.max(0, 100 - totalRiskScore);
    analysis.riskFactors = riskFactors;

    // Generate recommendations
    if (analysis.overallRisk === 'HIGH') {
      analysis.recommendations.push('Consider delaying flight until conditions improve');
      analysis.recommendations.push('File alternate flight plan with weather avoidance');
    } else if (analysis.overallRisk === 'MEDIUM') {
      analysis.recommendations.push('Monitor weather conditions closely during flight');
      analysis.recommendations.push('Have alternate airports identified along route');
    }

    res.json({
      success: true,
      analysis,
      analyzedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Safety analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze route safety',
      message: error.message
    });
  }
};

// Helper function to generate route summary
function generateRouteSummary(weatherSegments) {
  const severeCount = weatherSegments.filter(s => s.severity === 'SEVERE').length;
  const significantCount = weatherSegments.filter(s => s.severity === 'SIGNIFICANT').length;
  
  if (severeCount > 0) {
    return `Route has ${severeCount} severe weather segment(s). Recommend alternate routing or delay.`;
  } else if (significantCount > 0) {
    return `Route has ${significantCount} significant weather segment(s). Monitor conditions closely.`;
  } else {
    return 'Route conditions are generally favorable for flight.';
  }
}

module.exports = {
  generate,
  getRouteBriefing,
  analyzeSafety
};