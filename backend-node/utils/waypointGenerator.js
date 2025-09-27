// Waypoint Generator Utility
// Generates flight waypoints between origin and destination airports

const apiFetcher = require('./apiFetcher');

// Generate waypoints for flight route
const generateWaypoints = async (origin, destination, altitude = 35000, customRoute = null, providedCoords = null) => {
  if (!origin || !destination) {
    throw new Error('Origin and destination are required');
  }

  // Use provided coordinates if available, otherwise fetch from NLP service
  let originCoords, destCoords;
  
  if (providedCoords && providedCoords.originCoords && providedCoords.destCoords) {
    originCoords = providedCoords.originCoords;
    destCoords = providedCoords.destCoords;
  } else {
    // Fallback to NLP service with error handling
    try {
      originCoords = await apiFetcher.getAirportInfoFromNLP(origin);
    } catch (err) {
      throw new Error(`Origin ICAO lookup failed: ${err.message}`);
    }
    try {
      destCoords = await apiFetcher.getAirportInfoFromNLP(destination);
    } catch (err) {
      throw new Error(`Destination ICAO lookup failed: ${err.message}`);
    }
  }

  if (!originCoords || !destCoords) {
    throw new Error(`Airport coordinates not found for ${!originCoords ? origin : destination}`);
  }

  const waypoints = [];

  // Add departure airport
  waypoints.push({
    id: 1,
    name: origin,
    type: 'AIRPORT',
    lat: originCoords.lat,
    lon: originCoords.lon,
    altitude: 0,
    description: originCoords.name,
    estimatedTime: '00:00:00',
    distanceFromPrevious: 0,
    cumulativeDistance: 0
  });

  // If custom route is provided, use those waypoints
  if (customRoute && Array.isArray(customRoute)) {
    for (let i = 0; i < customRoute.length; i++) {
      const waypointId = customRoute[i];
      const waypointCoords = await apiFetcher.getAirportInfoFromNLP(waypointId);
      if (waypointCoords) {
        const prevWaypoint = waypoints[waypoints.length - 1];
        const distance = calculateDistance(prevWaypoint.lat, prevWaypoint.lon, waypointCoords.lat, waypointCoords.lon);
        waypoints.push({
          id: waypoints.length + 1,
          name: waypointId,
          type: 'WAYPOINT',
          lat: waypointCoords.lat,
          lon: waypointCoords.lon,
          altitude: altitude,
          description: waypointCoords.name,
          estimatedTime: calculateFlightTime(prevWaypoint.cumulativeDistance + distance, altitude),
          distanceFromPrevious: Math.round(distance),
          cumulativeDistance: Math.round(prevWaypoint.cumulativeDistance + distance)
        });
      }
    }
  } else {
    // Generate intermediate waypoints automatically
    const intermediateWaypoints = generateIntermediateWaypoints(originCoords, destCoords, altitude);
    for (let i = 0; i < intermediateWaypoints.length; i++) {
      const waypoint = intermediateWaypoints[i];
      const prevWaypoint = waypoints[waypoints.length - 1];
      const distance = calculateDistance(prevWaypoint.lat, prevWaypoint.lon, waypoint.lat, waypoint.lon);
      waypoints.push({
        id: waypoints.length + 1,
        name: waypoint.name,
        type: waypoint.type,
        lat: waypoint.lat,
        lon: waypoint.lon,
        altitude: altitude,
        description: waypoint.description,
        estimatedTime: calculateFlightTime(prevWaypoint.cumulativeDistance + distance, altitude),
        distanceFromPrevious: Math.round(distance),
        cumulativeDistance: Math.round(prevWaypoint.cumulativeDistance + distance)
      });
    }
  }

  // Add destination airport
  const lastWaypoint = waypoints[waypoints.length - 1];
  const finalDistance = calculateDistance(lastWaypoint.lat, lastWaypoint.lon, destCoords.lat, destCoords.lon);
  waypoints.push({
    id: waypoints.length + 1,
    name: destination,
    type: 'AIRPORT',
    lat: destCoords.lat,
    lon: destCoords.lon,
    altitude: 0,
    description: destCoords.name,
    estimatedTime: calculateFlightTime(lastWaypoint.cumulativeDistance + finalDistance, altitude),
    distanceFromPrevious: Math.round(finalDistance),
    cumulativeDistance: Math.round(lastWaypoint.cumulativeDistance + finalDistance)
  });

  return waypoints;
};

// Generate intermediate waypoints automatically
const generateIntermediateWaypoints = (origin, destination, altitude) => {
  const waypoints = [];
  const totalDistance = calculateDistance(origin.lat, origin.lon, destination.lat, destination.lon);
  
  // Determine number of intermediate waypoints based on distance
  let numWaypoints = 0;
  if (totalDistance > 2000) {
    numWaypoints = 4; // Long haul flights
  } else if (totalDistance > 1000) {
    numWaypoints = 2; // Medium haul flights
  } else if (totalDistance > 500) {
    numWaypoints = 1; // Short haul flights
  }

  // Generate waypoints along the great circle route
  for (let i = 1; i <= numWaypoints; i++) {
    const fraction = i / (numWaypoints + 1);
    const waypoint = interpolateCoordinates(origin, destination, fraction);
    // For now, use simple naming until we resolve the airportService issue
    waypoints.push({
      name: `${(origin.icao || 'WP').substring(0,3).toUpperCase()}${i}`,
      type: 'WAYPOINT',
      lat: waypoint.lat,
      lon: waypoint.lon,
      description: `Generated waypoint ${i} of ${numWaypoints}`
    });
  }

  return waypoints;
};

// Calculate total flight distance
const calculateTotalDistance = (waypoints) => {
  if (!waypoints || waypoints.length === 0) return 0;
  
  const lastWaypoint = waypoints[waypoints.length - 1];
  return lastWaypoint.cumulativeDistance || 0;
};

// Calculate estimated flight time
const calculateFlightTime = (distanceNM, altitudeFt = 35000) => {
  if (!distanceNM || distanceNM === 0) return '00:00:00';
  
  // Estimate ground speed based on altitude and typical aircraft performance
  let groundSpeed; // knots
  
  if (altitudeFt >= 30000) {
    groundSpeed = 480; // High altitude cruise
  } else if (altitudeFt >= 20000) {
    groundSpeed = 420; // Medium altitude
  } else if (altitudeFt >= 10000) {
    groundSpeed = 350; // Lower altitude
  } else {
    groundSpeed = 250; // Low altitude/approach
  }

  const timeHours = distanceNM / groundSpeed;
  const hours = Math.floor(timeHours);
  const minutes = Math.floor((timeHours - hours) * 60);
  const seconds = Math.floor(((timeHours - hours) * 60 - minutes) * 60);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// Helper functions
function getAirportCoords(icaoCode) {
  const code = icaoCode.toUpperCase();
  return AIRPORT_COORDS[code] || null;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  // Haversine formula to calculate great circle distance
  const R = 3440.065; // Earth's radius in nautical miles
  
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
            
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in nautical miles
}

function interpolateCoordinates(point1, point2, fraction) {
  // Linear interpolation for intermediate waypoints
  // Note: This is simplified - proper great circle interpolation would be more complex
  
  const lat = point1.lat + (point2.lat - point1.lat) * fraction;
  const lon = point1.lon + (point2.lon - point1.lon) * fraction;
  
  return {
    lat: parseFloat(lat.toFixed(6)),
    lon: parseFloat(lon.toFixed(6))
  };
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// Get available airports for autocomplete/dropdown
const getAvailableAirports = () => {
  return Object.keys(AIRPORT_COORDS).map(icao => ({
    icao,
    name: AIRPORT_COORDS[icao].name,
    coords: {
      lat: AIRPORT_COORDS[icao].lat,
      lon: AIRPORT_COORDS[icao].lon
    }
  })).sort((a, b) => a.icao.localeCompare(b.icao));
};

// Validate flight route
const validateRoute = (origin, destination, waypoints = []) => {
  const validation = {
    valid: true,
    errors: [],
    warnings: []
  };

  // Check if origin and destination exist
  if (!getAirportCoords(origin)) {
    validation.valid = false;
    validation.errors.push(`Origin airport ${origin} not found in database`);
  }

  if (!getAirportCoords(destination)) {
    validation.valid = false;
    validation.errors.push(`Destination airport ${destination} not found in database`);
  }

  // Check if origin and destination are the same
  if (origin === destination) {
    validation.valid = false;
    validation.errors.push('Origin and destination cannot be the same');
  }

  // Validate waypoints if provided
  for (const waypoint of waypoints) {
    if (!getAirportCoords(waypoint)) {
      validation.warnings.push(`Waypoint ${waypoint} not found in database - will be skipped`);
    }
  }

  // Calculate distance and check for reasonableness
  if (validation.valid) {
    const originCoords = getAirportCoords(origin);
    const destCoords = getAirportCoords(destination);
    const distance = calculateDistance(originCoords.lat, originCoords.lon, destCoords.lat, destCoords.lon);

    if (distance > 8000) {
      validation.warnings.push('Very long flight distance - consider fuel stops');
    } else if (distance < 50) {
      validation.warnings.push('Very short flight distance - consider if flight is necessary');
    }
  }

  return validation;
};

// Add new airport to database (for testing purposes)
const addAirport = (icao, lat, lon, name) => {
  AIRPORT_COORDS[icao.toUpperCase()] = {
    lat: parseFloat(lat),
    lon: parseFloat(lon),
    name: name || `${icao.toUpperCase()} Airport`
  };
  
  return true;
};

module.exports = {
  generateWaypoints,
  calculateTotalDistance,
  calculateFlightTime,
  getAvailableAirports,
  validateRoute,
  addAirport,
  // Export for testing
  calculateDistance,
  interpolateCoordinates
};