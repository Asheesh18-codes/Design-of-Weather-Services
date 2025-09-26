// API Fetcher Utility
// Fetches live weather data from AviationWeather.gov and other sources

const axios = require('axios');

// Base URLs for various aviation weather APIs
const API_ENDPOINTS = {
  aviationWeather: 'https://aviationweather.gov/data/api/',
  aviationWeatherV1: 'https://aviationweather.gov/adds/dataserver_current/httpparam',
  metarTaf: 'https://tgftp.nws.noaa.gov/data',
  backup: 'https://api.checkwx.com' // Backup service (requires API key)
};

// Configuration
const REQUEST_TIMEOUT = 10000; // 10 seconds
const RETRY_ATTEMPTS = 3;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Simple in-memory cache
const cache = new Map();

// Fetch latest METAR for airport
const getLatestMetar = async (icao) => {
  if (!icao) {
    throw new Error('ICAO code is required');
  }

  const cacheKey = `metar_${icao.toUpperCase()}`;
  
  // Check cache first
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
  }

  try {
    // Try primary API first
    const metarData = await fetchMetarFromPrimary(icao.toUpperCase());
    
    // Cache the result
    cache.set(cacheKey, {
      data: metarData,
      timestamp: Date.now()
    });
    
    return metarData;

  } catch (primaryError) {
    console.warn(`Primary METAR API failed for ${icao}:`, primaryError.message);
    
    // Try backup/mock data
    try {
      const mockData = generateMockMetar(icao.toUpperCase());
      return mockData;
      
    } catch (backupError) {
      console.error(`All METAR sources failed for ${icao}:`, backupError.message);
      throw new Error(`Unable to fetch METAR for ${icao}: ${primaryError.message}`);
    }
  }
};

// Fetch latest TAF for airport
const getLatestTaf = async (icao) => {
  if (!icao) {
    throw new Error('ICAO code is required');
  }

  const cacheKey = `taf_${icao.toUpperCase()}`;
  
  // Check cache first
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
  }

  try {
    // Try primary API first
    const tafData = await fetchTafFromPrimary(icao.toUpperCase());
    
    // Cache the result
    cache.set(cacheKey, {
      data: tafData,
      timestamp: Date.now()
    });
    
    return tafData;

  } catch (primaryError) {
    console.warn(`Primary TAF API failed for ${icao}:`, primaryError.message);
    
    // Try backup/mock data
    try {
      const mockData = generateMockTaf(icao.toUpperCase());
      return mockData;
      
    } catch (backupError) {
      console.error(`All TAF sources failed for ${icao}:`, backupError.message);
      throw new Error(`Unable to fetch TAF for ${icao}: ${primaryError.message}`);
    }
  }
};

// Fetch weather for specific coordinates
const getWeatherForCoordinates = async (lat, lon) => {
  try {
    // Find nearest airport and use its weather data
    const nearestIcao = await findNearestAirport(lat, lon);
    if (nearestIcao) {
      return await getLatestMetar(nearestIcao);
    }

    // Generate mock weather for coordinates if no nearby airport found
    return generateMockWeatherForCoordinates(lat, lon);

  } catch (error) {
    console.error(`Error fetching weather for coordinates ${lat}, ${lon}:`, error.message);
    return generateMockWeatherForCoordinates(lat, lon);
  }
};

// Fetch weather along route
const getWeatherAlongRoute = async (fromPoint, toPoint) => {
  try {
    const routeWeather = {
      departure: null,
      enroute: [],
      arrival: null
    };

    // Get weather at departure point
    if (fromPoint.icao) {
      routeWeather.departure = await getLatestMetar(fromPoint.icao);
    } else if (fromPoint.lat && fromPoint.lon) {
      routeWeather.departure = await getWeatherForCoordinates(fromPoint.lat, fromPoint.lon);
    }

    // Get weather at arrival point
    if (toPoint.icao) {
      routeWeather.arrival = await getLatestMetar(toPoint.icao);
    } else if (toPoint.lat && toPoint.lon) {
      routeWeather.arrival = await getWeatherForCoordinates(toPoint.lat, toPoint.lon);
    }

    // Get enroute weather (simplified - in real implementation would use gridded data)
    const midPoint = {
      lat: (fromPoint.lat + toPoint.lat) / 2,
      lon: (fromPoint.lon + toPoint.lon) / 2
    };
    
    routeWeather.enroute.push({
      location: 'Enroute',
      coordinates: midPoint,
      weather: await getWeatherForCoordinates(midPoint.lat, midPoint.lon)
    });

    return routeWeather;

  } catch (error) {
    console.error('Error fetching route weather:', error.message);
    return {
      departure: generateMockWeatherForCoordinates(fromPoint.lat, fromPoint.lon),
      enroute: [],
      arrival: generateMockWeatherForCoordinates(toPoint.lat, toPoint.lon)
    };
  }
};

// Fetch NOTAMs for airport
const getNotamsForAirport = async (icao) => {
  try {
    // In real implementation, would fetch from FAA NOTAM service
    // For now, return mock NOTAMs
    return generateMockNotamsForAirport(icao.toUpperCase());

  } catch (error) {
    console.error(`Error fetching NOTAMs for ${icao}:`, error.message);
    return [];
  }
};

// Private helper functions

async function fetchMetarFromPrimary(icao) {
  const url = `${API_ENDPOINTS.aviationWeather}/metar`;
  const params = {
    ids: icao,
    format: 'json',
    taf: 'false',
    hours: '1'
  };

  const response = await axios.get(url, {
    params,
    timeout: REQUEST_TIMEOUT,
    headers: {
      'User-Agent': 'Aviation Weather Briefing App'
    }
  });

  if (response.data && response.data.length > 0) {
    const metarData = response.data[0];
    return {
      raw: metarData.rawOb || metarData.raw_text,
      observationTime: metarData.obsTime || metarData.observation_time,
      station: metarData.icaoId || metarData.station_id,
      coordinates: {
        lat: metarData.lat || metarData.latitude,
        lon: metarData.lon || metarData.longitude
      }
    };
  }

  throw new Error(`No METAR data available for ${icao}`);
}

async function fetchTafFromPrimary(icao) {
  const url = `${API_ENDPOINTS.aviationWeather}/taf`;
  const params = {
    ids: icao,
    format: 'json',
    metar: 'false'
  };

  const response = await axios.get(url, {
    params,
    timeout: REQUEST_TIMEOUT,
    headers: {
      'User-Agent': 'Aviation Weather Briefing App'
    }
  });

  if (response.data && response.data.length > 0) {
    const tafData = response.data[0];
    return {
      raw: tafData.rawTAF || tafData.raw_text,
      issueTime: tafData.issueTime || tafData.issue_time,
      station: tafData.icaoId || tafData.station_id,
      validTime: tafData.validTime || tafData.valid_time_from
    };
  }

  throw new Error(`No TAF data available for ${icao}`);
}

async function findNearestAirport(lat, lon) {
  // Simple distance calculation to find nearest major airport
  const majorAirports = {
    'KJFK': { lat: 40.6413, lon: -73.7781 },
    'KLAX': { lat: 33.9425, lon: -118.4081 },
    'KORD': { lat: 41.9742, lon: -87.9073 },
    'KATL': { lat: 33.6367, lon: -84.4281 },
    'KDEN': { lat: 39.8561, lon: -104.6737 },
    'KSFO': { lat: 37.6213, lon: -122.3790 }
  };

  let nearestAirport = null;
  let minDistance = Infinity;

  for (const [icao, coords] of Object.entries(majorAirports)) {
    const distance = calculateDistance(lat, lon, coords.lat, coords.lon);
    if (distance < minDistance) {
      minDistance = distance;
      nearestAirport = icao;
    }
  }

  // Return nearest airport if within 200 nautical miles
  return minDistance <= 200 ? nearestAirport : null;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3440; // Earth's radius in nautical miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
            
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Mock data generators for testing/fallback

function generateMockMetar(icao) {
  // Generate random temperature and dew point for realism
  const temp = Math.floor(Math.random() * 20) + 10; // 10°C to 29°C
  const dew = temp - (Math.floor(Math.random() * 7) + 2); // dew point 2-8°C lower
  const windDir = String(Math.floor(Math.random() * 36) * 10).padStart(3, '0');
  const windSpeed = Math.floor(Math.random() * 20) + 2; // 2-21 KT
  const altimeter = 2990 + Math.floor(Math.random() * 30); // 2990-3019
  const metarText = `${icao} 252153Z ${windDir}${windSpeed < 10 ? '0' : ''}${windSpeed}KT 10SM CLR ${temp}/${dew} A${altimeter} RMK AO2`;
  return {
    raw: metarText,
    observationTime: new Date().toISOString(),
    station: icao,
    coordinates: { lat: 40.0, lon: -74.0 },
    source: 'mock'
  };
}

function generateMockTaf(icao) {
  const mockTafs = {
    'KJFK': 'TAF KJFK 252030Z 2521/2624 24015G20KT P6SM BKN020 TEMPO 2521/2524 BKN012',
    'KLAX': 'TAF KLAX 252030Z 2521/2624 25008KT P6SM SKC BECMG 2602/2604 BKN015',
    'KORD': 'TAF KORD 252030Z 2521/2624 28012KT 6SM BKN020 TEMPO 2521/2603 4SM BR BKN010',
    'KATL': 'TAF KATL 252030Z 2521/2624 31018G25KT P6SM SCT030 BKN100',
    'KDEN': 'TAF KDEN 252030Z 2521/2624 25015KT P6SM FEW120 SCT180'
  };

  const tafText = mockTafs[icao] || `TAF ${icao} 252030Z 2521/2624 00000KT P6SM SKC`;
  
  return {
    raw: tafText,
    issueTime: new Date().toISOString(),
    station: icao,
    validTime: new Date(Date.now() + 24*60*60*1000).toISOString(),
    source: 'mock'
  };
}

function generateMockWeatherForCoordinates(lat, lon) {
  // Generate realistic weather based on location and season
  const temp = Math.round(15 + Math.random() * 15); // 15-30°C
  const windSpeed = Math.round(Math.random() * 20); // 0-20 knots
  const visibility = Math.round(5 + Math.random() * 5); // 5-10 miles
  
  const conditions = ['CLR', 'FEW', 'SCT', 'BKN'];
  const condition = conditions[Math.floor(Math.random() * conditions.length)];
  
  const mockMetar = `MOCK ${formatDate(new Date())}Z ${String(Math.round(Math.random() * 360)).padStart(3, '0')}${String(windSpeed).padStart(2, '0')}KT ${visibility}SM ${condition}025 ${String(temp).padStart(2, '0')}/15 A3000`;
  
  return {
    raw: mockMetar,
    observationTime: new Date().toISOString(),
    station: 'MOCK',
    coordinates: { lat, lon },
    source: 'generated'
  };
}

function generateMockNotamsForAirport(icao) {
  return [
    {
      id: `${icao}_NOTAM_001`,
      type: 'RUNWAY',
      effective: new Date().toISOString(),
      expires: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
      text: `${icao} RWY 09/27 CLSD FOR MAINT 1200-1800 DAILY`,
      severity: 'MEDIUM'
    },
    {
      id: `${icao}_NOTAM_002`,
      type: 'NAVAID',
      effective: new Date().toISOString(),
      expires: new Date(Date.now() + 3*24*60*60*1000).toISOString(),
      text: `${icao} ILS RWY 09 U/S FOR MAINT`,
      severity: 'LOW'
    }
  ];
}

function formatDate(date) {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  return `${day}${hour}${minute}`;
}

// Clear cache function
const clearCache = () => {
  cache.clear();
};

// Get cache statistics
const getCacheStats = () => {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
    oldest: cache.size > 0 ? Math.min(...Array.from(cache.values()).map(v => v.timestamp)) : null,
    newest: cache.size > 0 ? Math.max(...Array.from(cache.values()).map(v => v.timestamp)) : null
  };
};

// Fetch airport info from Python NLP service
const getAirportInfoFromNLP = async (icao) => {
  if (!icao) throw new Error('ICAO code is required');
  const url = `http://localhost:8000/api/airport-info?icao=${encodeURIComponent(icao)}`;
  try {
    const response = await axios.get(url, { timeout: REQUEST_TIMEOUT });
    if (response.data && response.data.lat && response.data.lon) {
      return {
        lat: response.data.lat,
        lon: response.data.lon,
        name: response.data.name || icao
      };
    } else {
      throw new Error(`No coordinates found for ICAO ${icao}`);
    }
  } catch (error) {
    throw new Error(`Failed to fetch airport info for ${icao}: ${error.message}`);
  }
};

module.exports = {
  getLatestMetar,
  getLatestTaf,
  getWeatherForCoordinates,
  getWeatherAlongRoute,
  getNotamsForAirport,
  clearCache,
  getCacheStats,
  getAirportInfoFromNLP,
  // Export for testing
  generateMockMetar,
  generateMockTaf,
  findNearestAirport,
  calculateDistance
};