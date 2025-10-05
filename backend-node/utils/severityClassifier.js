// Severity Classifier Utility
// Classifies weather conditions and flight safety into severity levels

const SEVERITY_LEVELS = {
  CLEAR: 'CLEAR',
  SIGNIFICANT: 'SIGNIFICANT', 
  SEVERE: 'SEVERE'
};

// Severity thresholds for various weather parameters
const THRESHOLDS = {
  visibility: {
    severe: 3,    // miles
    significant: 6
  },
  windSpeed: {
    severe: 25,   // knots
    significant: 15
  },
  ceiling: {
    severe: 1000,  // feet
    significant: 3000
  },
  gustFactor: {
    severe: 15,    // knots above base wind
    significant: 10
  },
  temperature: {
    severeCold: -20,  // Celsius
    significantCold: -10,
    severeHot: 45,
    significantHot: 35
  }
};

// Weather phenomena severity weights
const WEATHER_WEIGHTS = {
  'TS': 20,      // Thunderstorm
  'TSGR': 25,    // Thunderstorm with hail
  'TSRA': 18,    // Thunderstorm with rain
  '+TS': 30,     // Heavy thunderstorm
  'FZRA': 15,    // Freezing rain
  'FZDZ': 12,    // Freezing drizzle
  '+RA': 8,      // Heavy rain
  '+SN': 10,     // Heavy snow
  'BLSN': 12,    // Blowing snow
  'FC': 25,      // Funnel cloud/tornado
  'VA': 30,      // Volcanic ash
  'SS': 20,      // Sandstorm
  'DS': 18,      // Duststorm
  '+GR': 15,     // Heavy hail
  'IC': 8,       // Ice crystals
  'FG': 6,       // Fog
  'BR': 3,       // Mist
  'HZ': 2,       // Haze
  '-RA': 1,      // Light rain
  '-SN': 2       // Light snow
};

// Classify current weather conditions
const classifyWeatherConditions = (weatherData) => {
  if (!weatherData) return SEVERITY_LEVELS.CLEAR;

  let riskScore = 0;
  const riskFactors = [];

  try {
    // Visibility check
    if (weatherData.visibility) {
      const visibilityMiles = parseVisibility(weatherData.visibility);
      
      if (visibilityMiles !== null) {
        if (visibilityMiles <= THRESHOLDS.visibility.severe) {
          riskScore += 15;
          riskFactors.push('Low visibility');
        } else if (visibilityMiles <= THRESHOLDS.visibility.significant) {
          riskScore += 8;
          riskFactors.push('Reduced visibility');
        }
      }
    }

    // Wind conditions check
    if (weatherData.wind) {
      const windSpeed = weatherData.wind.speed || 0;
      const gustSpeed = weatherData.wind.gust || 0;
      const gustFactor = gustSpeed - windSpeed;

      if (windSpeed >= THRESHOLDS.windSpeed.severe || gustSpeed >= THRESHOLDS.windSpeed.severe) {
        riskScore += 12;
        riskFactors.push('High winds');
      } else if (windSpeed >= THRESHOLDS.windSpeed.significant || gustSpeed >= THRESHOLDS.windSpeed.significant) {
        riskScore += 6;
        riskFactors.push('Moderate winds');
      }

      if (gustFactor >= THRESHOLDS.gustFactor.severe) {
        riskScore += 8;
        riskFactors.push('Strong wind gusts');
      } else if (gustFactor >= THRESHOLDS.gustFactor.significant) {
        riskScore += 4;
        riskFactors.push('Wind gusts');
      }
    }

    // Cloud ceiling check
    if (weatherData.clouds && Array.isArray(weatherData.clouds)) {
      const lowestCeiling = getLowestCeiling(weatherData.clouds);
      
      if (lowestCeiling !== null) {
        if (lowestCeiling <= THRESHOLDS.ceiling.severe) {
          riskScore += 10;
          riskFactors.push('Low ceiling');
        } else if (lowestCeiling <= THRESHOLDS.ceiling.significant) {
          riskScore += 5;
          riskFactors.push('Moderate ceiling');
        }
      }
    }

    // Weather phenomena check
    if (weatherData.weather && Array.isArray(weatherData.weather)) {
      for (const phenomenon of weatherData.weather) {
        const wxCode = phenomenon.raw || phenomenon.phenomena || phenomenon;
        const weight = WEATHER_WEIGHTS[wxCode] || WEATHER_WEIGHTS[wxCode?.toUpperCase()] || 0;
        
        if (weight > 0) {
          riskScore += weight;
          riskFactors.push(phenomenon.description || wxCode);
        }
      }
    }

    // Temperature extremes
    if (weatherData.temperature !== null && weatherData.temperature !== undefined) {
      const temp = weatherData.temperature;
      
      if (temp <= THRESHOLDS.temperature.severeCold || temp >= THRESHOLDS.temperature.severeHot) {
        riskScore += 6;
        riskFactors.push('Extreme temperature');
      } else if (temp <= THRESHOLDS.temperature.significantCold || temp >= THRESHOLDS.temperature.significantHot) {
        riskScore += 3;
        riskFactors.push('Temperature advisory');
      }
    }

    // Determine severity based on total risk score
    const severity = calculateSeverityLevel(riskScore);

    return severity;

  } catch (error) {
    console.error('Error classifying weather conditions:', error);
    return SEVERITY_LEVELS.CLEAR;
  }
};

// Classify forecast conditions (TAF data)
const classifyForecast = (forecastData) => {
  if (!forecastData || !forecastData.periods) {
    return SEVERITY_LEVELS.CLEAR;
  }

  let maxSeverity = SEVERITY_LEVELS.CLEAR;

  // Check each forecast period
  for (const period of forecastData.periods) {
    const periodSeverity = classifyWeatherConditions(period);
    
    if (compareSeverity(periodSeverity, maxSeverity) > 0) {
      maxSeverity = periodSeverity;
    }
  }

  return maxSeverity;
};

// Classify individual waypoint
const classifyWaypoint = (waypointData) => {
  if (!waypointData) return SEVERITY_LEVELS.CLEAR;

  // Use weather data if available
  if (waypointData.weather) {
    return classifyWeatherConditions(waypointData.weather);
  }

  // Use conditions data if available
  if (waypointData.conditions) {
    return classifyWeatherConditions(waypointData.conditions);
  }

  // Random classification for demo purposes (replace with real logic)
  const random = Math.random();
  if (random < 0.1) return SEVERITY_LEVELS.SEVERE;
  if (random < 0.3) return SEVERITY_LEVELS.SIGNIFICANT;
  return SEVERITY_LEVELS.CLEAR;
};

// Get overall severity for multiple waypoints/conditions
const getOverallSeverity = (items) => {
  if (!items || items.length === 0) return SEVERITY_LEVELS.CLEAR;

  let maxSeverity = SEVERITY_LEVELS.CLEAR;

  for (const item of items) {
    let itemSeverity;
    
    if (typeof item === 'string') {
      itemSeverity = item;
    } else if (item.severity) {
      itemSeverity = item.severity;
    } else {
      itemSeverity = classifyWaypoint(item);
    }

    if (compareSeverity(itemSeverity, maxSeverity) > 0) {
      maxSeverity = itemSeverity;
    }
  }

  return maxSeverity;
};

// Get overall severity for route segments
const getRouteSeverity = (segments) => {
  if (!segments || segments.length === 0) return SEVERITY_LEVELS.CLEAR;

  const severities = segments.map(segment => segment.severity);
  return getOverallSeverity(severities);
};

// Compare severity levels (returns -1, 0, or 1)
const compareSeverity = (severity1, severity2) => {
  const levels = [SEVERITY_LEVELS.CLEAR, SEVERITY_LEVELS.SIGNIFICANT, SEVERITY_LEVELS.SEVERE];
  
  const index1 = levels.indexOf(severity1);
  const index2 = levels.indexOf(severity2);
  
  return index1 - index2;
};

// Get detailed weather analysis
const getWeatherDetails = (weatherData) => {
  const details = {
    riskFactors: [],
    safetyScore: 100,
    conditions: {
      visibility: null,
      winds: null,
      ceiling: null,
      precipitation: null,
      temperature: null
    },
    recommendations: []
  };

  if (!weatherData) return details;

  let riskScore = 0;

  try {
    // Analyze visibility
    if (weatherData.visibility) {
      const visibilityMiles = parseVisibility(weatherData.visibility);
      details.conditions.visibility = visibilityMiles ? `${visibilityMiles} miles` : 'Unknown';
      
      if (visibilityMiles && visibilityMiles <= 3) {
        details.riskFactors.push('Poor visibility conditions');
        riskScore += 15;
      }
    }

    // Analyze winds
    if (weatherData.wind && weatherData.wind.speed) {
      const windSpeed = weatherData.wind.speed;
      const gustSpeed = weatherData.wind.gust || 0;
      
      details.conditions.winds = gustSpeed > windSpeed ? 
        `${windSpeed} knots gusting to ${gustSpeed} knots` : 
        `${windSpeed} knots`;

      if (windSpeed >= 25 || gustSpeed >= 30) {
        details.riskFactors.push('High wind conditions');
        riskScore += 12;
      }
    }

    // Analyze ceiling
    if (weatherData.clouds) {
      const ceiling = getLowestCeiling(weatherData.clouds);
      details.conditions.ceiling = ceiling ? `${ceiling} feet` : 'Clear';
      
      if (ceiling && ceiling <= 1000) {
        details.riskFactors.push('Low cloud ceiling');
        riskScore += 10;
      }
    }

    // Analyze precipitation
    if (weatherData.weather && weatherData.weather.length > 0) {
      const precip = weatherData.weather.map(w => w.description || w.raw).join(', ');
      details.conditions.precipitation = precip;
      
      const hasThunderstorms = weatherData.weather.some(w => 
        (w.raw || w.phenomena || '').includes('TS'));
      
      if (hasThunderstorms) {
        details.riskFactors.push('Thunderstorm activity');
        riskScore += 20;
      }
    } else {
      details.conditions.precipitation = 'None';
    }

    // Analyze temperature
    if (weatherData.temperature !== null && weatherData.temperature !== undefined) {
      details.conditions.temperature = `${weatherData.temperature}°C`;
      
      if (weatherData.temperature <= -20 || weatherData.temperature >= 45) {
        details.riskFactors.push('Extreme temperature conditions');
        riskScore += 6;
      }
    }

    // Generate recommendations
    if (riskScore >= 20) {
      details.recommendations.push('Consider delaying flight due to severe weather');
      details.recommendations.push('Monitor weather conditions closely');
    } else if (riskScore >= 10) {
      details.recommendations.push('Exercise caution during flight operations');
      details.recommendations.push('Have alternate plans ready');
    } else {
      details.recommendations.push('Conditions are generally favorable');
    }

    details.safetyScore = Math.max(0, 100 - riskScore);

  } catch (error) {
    console.error('Error analyzing weather details:', error);
    details.riskFactors.push('Error analyzing weather data');
  }

  return details;
};

// Get forecast analysis details
const getForecastDetails = (forecastData) => {
  const details = {
    periods: [],
    overallTrend: 'STABLE',
    significantChanges: [],
    maxSeverity: SEVERITY_LEVELS.CLEAR
  };

  if (!forecastData || !forecastData.periods) {
    return details;
  }

  // Analyze each period
  for (const period of forecastData.periods) {
    const periodDetails = getWeatherDetails(period);
    const severity = classifyWeatherConditions(period);
    
    details.periods.push({
      type: period.type,
      time: period.time || period.validFrom,
      severity,
      details: periodDetails,
      summary: generatePeriodSummary(period, severity)
    });

    if (compareSeverity(severity, details.maxSeverity) > 0) {
      details.maxSeverity = severity;
    }
  }

  // Identify significant changes
  for (let i = 1; i < details.periods.length; i++) {
    const prevPeriod = details.periods[i - 1];
    const currentPeriod = details.periods[i];
    
    const severityChange = compareSeverity(currentPeriod.severity, prevPeriod.severity);
    
    if (Math.abs(severityChange) > 0) {
      const changeType = severityChange > 0 ? 'deteriorating' : 'improving';
      details.significantChanges.push({
        time: currentPeriod.time,
        type: changeType,
        from: prevPeriod.severity,
        to: currentPeriod.severity,
        description: `Conditions ${changeType} from ${prevPeriod.severity} to ${currentPeriod.severity}`
      });
    }
  }

  // Determine overall trend
  if (details.significantChanges.length === 0) {
    details.overallTrend = 'STABLE';
  } else {
    const lastChange = details.significantChanges[details.significantChanges.length - 1];
    details.overallTrend = lastChange.type.toUpperCase();
  }

  return details;
};

// Helper functions
function parseVisibility(visibility) {
  if (!visibility) return null;
  
  if (typeof visibility === 'object' && visibility.distance !== null) {
    const distance = visibility.distance;
    
    if (typeof distance === 'number') {
      return distance;
    } else if (typeof distance === 'string') {
      // Handle fractional visibilities like "1/2", "3/4"
      if (distance.includes('/')) {
        const [num, den] = distance.split('/');
        return parseInt(num) / parseInt(den);
      } else if (distance.includes('greater')) {
        return 10; // Assume 10+ miles for "greater than" cases
      } else if (distance.includes('less')) {
        return 0.5; // Assume 0.5 miles for "less than" cases
      } else {
        return parseFloat(distance);
      }
    }
  }

  return null;
}

function getLowestCeiling(clouds) {
  if (!clouds || !Array.isArray(clouds)) return null;
  
  const ceilingClouds = clouds.filter(cloud => 
    cloud.coverage === 'broken' || cloud.coverage === 'overcast' ||
    cloud.coverage === 'BKN' || cloud.coverage === 'OVC'
  );

  if (ceilingClouds.length === 0) return null;

  return Math.min(...ceilingClouds.map(cloud => cloud.altitude));
}

function calculateSeverityLevel(riskScore) {
  if (riskScore >= 20) {
    return SEVERITY_LEVELS.SEVERE;
  } else if (riskScore >= 8) {
    return SEVERITY_LEVELS.SIGNIFICANT;
  } else {
    return SEVERITY_LEVELS.CLEAR;
  }
}

function generatePeriodSummary(period, severity) {
  const conditions = [];
  
  if (period.wind && period.wind.speed) {
    conditions.push(`Wind ${period.wind.speed} knots`);
  }
  
  if (period.visibility && period.visibility.distance) {
    conditions.push(`Visibility ${period.visibility.distance} miles`);
  }
  
  if (period.weather && period.weather.length > 0) {
    conditions.push(period.weather[0].description || period.weather[0].raw);
  }

  const summary = conditions.length > 0 ? conditions.join(', ') : 'No significant weather';
  return `${severity}: ${summary}`;
}

// Classify weather severity for a flight segment between two points
function classifySegment(fromPoint, toPoint) {
  // Simple classification based on basic weather conditions
  // In a real implementation, this would analyze weather along the route
  try {
    // Mock severity classification for segment
    const distance = Math.sqrt(
      Math.pow(toPoint.lat - fromPoint.lat, 2) + 
      Math.pow(toPoint.lon - fromPoint.lon, 2)
    );
    
    // Simple heuristic: longer segments might have more varied conditions
    if (distance > 10) {
      return SEVERITY_LEVELS.SIGNIFICANT;
    } else {
      return SEVERITY_LEVELS.CLEAR;
    }
  } catch (error) {
    console.error('Error classifying segment:', error);
    return SEVERITY_LEVELS.CLEAR;
  }
}

module.exports = {
  SEVERITY_LEVELS,
  classifyWeatherConditions,
  classifyForecast,
  classifyWaypoint,
  classifySegment,
  getOverallSeverity,
  getRouteSeverity,
  compareSeverity,
  getWeatherDetails,
  getForecastDetails,
  // Export for testing
  THRESHOLDS,
  WEATHER_WEIGHTS,
  parseVisibility,
  getLowestCeiling
};