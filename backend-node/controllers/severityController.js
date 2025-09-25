const severityClassifier = require('../utils/severityClassifier');

// Classify weather conditions severity
const classifyWeather = async (req, res) => {
  try {
    const { weatherData, type = 'current' } = req.body;

    if (!weatherData) {
      return res.status(400).json({
        error: 'Weather data is required',
        supportedTypes: ['current', 'forecast', 'metar', 'taf']
      });
    }

    let severity;
    let details = {};

    switch (type) {
      case 'current':
      case 'metar':
        severity = severityClassifier.classifyWeatherConditions(weatherData);
        details = severityClassifier.getWeatherDetails(weatherData);
        break;
      case 'forecast':
      case 'taf':
        severity = severityClassifier.classifyForecast(weatherData);
        details = severityClassifier.getForecastDetails(weatherData);
        break;
      default:
        return res.status(400).json({
          error: 'Invalid classification type',
          validTypes: ['current', 'forecast', 'metar', 'taf']
        });
    }

    res.json({
      success: true,
      severity,
      details,
      classification: {
        level: severity,
        color: getSeverityColor(severity),
        icon: getSeverityIcon(severity),
        description: getSeverityDescription(severity),
        recommendations: getSeverityRecommendations(severity)
      },
      classifiedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Weather classification error:', error);
    res.status(500).json({
      error: 'Failed to classify weather conditions',
      message: error.message
    });
  }
};

// Classify route safety based on multiple waypoints
const classifyRoute = async (req, res) => {
  try {
    const { waypoints, flightLevel = 35000 } = req.body;

    if (!waypoints || !Array.isArray(waypoints)) {
      return res.status(400).json({
        error: 'Array of waypoints with weather data is required'
      });
    }

    const routeAnalysis = {
      overallSeverity: 'CLEAR',
      segments: [],
      riskFactors: [],
      safetyScore: 100,
      recommendations: []
    };

    let totalRiskScore = 0;

    // Analyze each segment
    for (let i = 0; i < waypoints.length; i++) {
      const waypoint = waypoints[i];
      const waypointSeverity = severityClassifier.classifyWaypoint(waypoint);
      
      const segment = {
        waypoint: waypoint.name || `Waypoint ${i + 1}`,
        coordinates: { lat: waypoint.lat, lon: waypoint.lon },
        severity: waypointSeverity,
        conditions: waypoint.weather || waypoint.conditions,
        riskFactors: []
      };

      // Check for specific risk factors
      if (waypoint.weather) {
        if (waypoint.weather.visibility < 3) {
          segment.riskFactors.push('Low visibility');
          totalRiskScore += 10;
        }
        if (waypoint.weather.windSpeed > 25) {
          segment.riskFactors.push('High winds');
          totalRiskScore += 8;
        }
        if (waypoint.weather.precipitation && waypoint.weather.precipitation.includes('TS')) {
          segment.riskFactors.push('Thunderstorms');
          totalRiskScore += 15;
        }
        if (waypoint.weather.icing) {
          segment.riskFactors.push('Icing conditions');
          totalRiskScore += 12;
        }
        if (waypoint.weather.turbulence && waypoint.weather.turbulence > 'LIGHT') {
          segment.riskFactors.push('Turbulence');
          totalRiskScore += 6;
        }
      }

      routeAnalysis.segments.push(segment);
      
      // Add to overall risk factors
      if (segment.riskFactors.length > 0) {
        routeAnalysis.riskFactors.push({
          location: segment.waypoint,
          factors: segment.riskFactors
        });
      }
    }

    // Calculate overall severity and safety score
    routeAnalysis.overallSeverity = severityClassifier.getRouteSeverity(routeAnalysis.segments);
    routeAnalysis.safetyScore = Math.max(0, 100 - totalRiskScore);

    // Generate recommendations
    if (routeAnalysis.overallSeverity === 'SEVERE') {
      routeAnalysis.recommendations.push('❌ Consider cancelling or significantly delaying flight');
      routeAnalysis.recommendations.push('🔄 File alternate route avoiding severe weather areas');
      routeAnalysis.recommendations.push('📞 Coordinate with ATC for weather deviations');
    } else if (routeAnalysis.overallSeverity === 'SIGNIFICANT') {
      routeAnalysis.recommendations.push('⚠️ Monitor weather conditions closely during flight');
      routeAnalysis.recommendations.push('🛫 Consider higher or lower flight level if available');
      routeAnalysis.recommendations.push('🏠 Identify alternate airports along route');
    } else {
      routeAnalysis.recommendations.push('✅ Route conditions are favorable for flight');
      routeAnalysis.recommendations.push('👀 Continue monitoring weather updates');
    }

    res.json({
      success: true,
      routeAnalysis,
      flightLevel,
      analysisTime: new Date().toISOString()
    });

  } catch (error) {
    console.error('Route classification error:', error);
    res.status(500).json({
      error: 'Failed to classify route safety',
      message: error.message
    });
  }
};

// Get severity definitions and thresholds
const getSeverityInfo = (req, res) => {
  try {
    const severityInfo = {
      levels: {
        CLEAR: {
          description: 'Favorable weather conditions for flight operations',
          color: '#22c55e',
          icon: '🌤️',
          thresholds: {
            visibility: '>= 6 miles',
            windSpeed: '<= 15 knots',
            ceiling: '>= 3000 feet',
            precipitation: 'None or light'
          }
        },
        SIGNIFICANT: {
          description: 'Weather conditions that require attention and monitoring',
          color: '#f59e0b',
          icon: '⚡',
          thresholds: {
            visibility: '3-6 miles',
            windSpeed: '16-25 knots',
            ceiling: '1000-3000 feet',
            precipitation: 'Moderate'
          }
        },
        SEVERE: {
          description: 'Weather conditions that significantly impact flight safety',
          color: '#ef4444',
          icon: '⚠️',
          thresholds: {
            visibility: '< 3 miles',
            windSpeed: '> 25 knots',
            ceiling: '< 1000 feet',
            precipitation: 'Heavy or thunderstorms'
          }
        }
      },
      riskFactors: {
        thunderstorms: { weight: 15, description: 'Thunderstorm activity' },
        icing: { weight: 12, description: 'Icing conditions' },
        lowVisibility: { weight: 10, description: 'Visibility below minimums' },
        highWinds: { weight: 8, description: 'High wind speeds or gusts' },
        turbulence: { weight: 6, description: 'Moderate to severe turbulence' },
        lowCeiling: { weight: 8, description: 'Cloud ceiling below minimums' }
      },
      safetyScoreRanges: {
        excellent: { min: 90, max: 100, color: '#22c55e' },
        good: { min: 70, max: 89, color: '#84cc16' },
        fair: { min: 50, max: 69, color: '#f59e0b' },
        poor: { min: 30, max: 49, color: '#f97316' },
        dangerous: { min: 0, max: 29, color: '#ef4444' }
      }
    };

    res.json({
      success: true,
      severityInfo,
      version: '1.0.0',
      lastUpdated: '2024-01-15T00:00:00Z'
    });

  } catch (error) {
    console.error('Severity info error:', error);
    res.status(500).json({
      error: 'Failed to get severity information',
      message: error.message
    });
  }
};

// Helper functions
function getSeverityColor(severity) {
  const colors = {
    CLEAR: '#22c55e',
    SIGNIFICANT: '#f59e0b',
    SEVERE: '#ef4444'
  };
  return colors[severity] || '#6b7280';
}

function getSeverityIcon(severity) {
  const icons = {
    CLEAR: '🌤️',
    SIGNIFICANT: '⚡',
    SEVERE: '⚠️'
  };
  return icons[severity] || '❓';
}

function getSeverityDescription(severity) {
  const descriptions = {
    CLEAR: 'Favorable weather conditions for flight operations',
    SIGNIFICANT: 'Weather conditions that require attention and monitoring',
    SEVERE: 'Weather conditions that significantly impact flight safety'
  };
  return descriptions[severity] || 'Unknown weather conditions';
}

function getSeverityRecommendations(severity) {
  const recommendations = {
    CLEAR: [
      'Normal flight operations expected',
      'Continue routine weather monitoring'
    ],
    SIGNIFICANT: [
      'Monitor weather conditions closely',
      'Be prepared for possible delays or routing changes',
      'Ensure alternate airports are available'
    ],
    SEVERE: [
      'Consider cancelling or delaying flight',
      'If proceeding, coordinate closely with ATC',
      'Have multiple alternate plans ready'
    ]
  };
  return recommendations[severity] || ['Consult with meteorology department'];
}

module.exports = {
  classifyWeather,
  classifyRoute,
  getSeverityInfo
};