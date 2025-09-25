const waypointGenerator = require('../utils/waypointGenerator');
const severityClassifier = require('../utils/severityClassifier');
const apiFetcher = require('../utils/apiFetcher');

// Generate flight plan with waypoints
const generate = async (req, res) => {
  try {
    const { origin, destination, altitude = 35000, route } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['origin', 'destination'],
        provided: req.body
      });
    }

    // Generate waypoints
    const waypoints = waypointGenerator.generateWaypoints(origin, destination, altitude, route);

    // Get weather data for each waypoint
    const waypointWeather = [];
    for (const waypoint of waypoints) {
      const weather = await apiFetcher.getWeatherForCoordinates(waypoint.lat, waypoint.lon);
      const severity = severityClassifier.classifyWaypoint(weather);
      
      waypointWeather.push({
        ...waypoint,
        weather,
        severity
      });
    }

    res.json({
      success: true,
      flightPlan: {
        origin,
        destination,
        altitude,
        distance: waypointGenerator.calculateTotalDistance(waypoints),
        estimatedTime: waypointGenerator.calculateFlightTime(waypoints, altitude),
        waypoints: waypointWeather,
        overallSeverity: severityClassifier.getOverallSeverity(waypointWeather)
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Flight plan generation error:', error);
    res.status(500).json({
      error: 'Failed to generate flight plan',
      message: error.message
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