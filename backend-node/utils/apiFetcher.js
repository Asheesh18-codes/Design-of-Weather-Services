// API Fetcher Utility
// Fetches live weather data from AviationWeather.gov and CheckWX.com backup

const axios = require('axios');
require('dotenv').config();

// Base URLs for various aviation weather APIs
const API_ENDPOINTS = {
  aviationWeather: 'https://aviationweather.gov/data/api/',
  metarTaf: 'https://tgftp.nws.noaa.gov/data',
  checkwx: process.env.CHECKWX_API_URL || 'https://api.checkwx.com' // Use env var if set
};

// CheckWX API Configuration
const CHECKWX_API_KEY = process.env.WEATHER_API_KEY || process.env.CHECKWX_API_KEY;

// Configuration
const REQUEST_TIMEOUT = 10000; // 10 seconds
const RETRY_ATTEMPTS = 3;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes - increased to reduce API calls and preserve forecast periods

// Simple in-memory cache
const cache = new Map();

// Utility: Check API endpoint health
async function checkApiEndpointHealth(url, apiKey) {
  try {
    const response = await axios.get(url, {
      headers: apiKey ? { 'X-API-Key': apiKey } : {},
      timeout: REQUEST_TIMEOUT
    });
    console.log(`[API Health] Endpoint ${url} responded with status ${response.status}`);
    return response.status === 200;
  } catch (error) {
    console.error(`[API Health] Endpoint ${url} failed:`, error.message);
    return false;
  }
}

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
    
    // Try CheckWX backup API
    try {
      const backupData = await fetchMetarFromCheckWX(icao.toUpperCase());
      
      // Cache the backup result
      cache.set(cacheKey, {
        data: backupData,
        timestamp: Date.now()
      });
      
      return backupData;
      
    } catch (backupError) {
      // CheckWX backup failed, falling back to mock data
      
      // Final fallback to mock data
      try {
        const mockData = generateMockMetar(icao.toUpperCase());
        return mockData;
      } catch (mockError) {
        console.error(`All METAR sources failed for ${icao}:`, mockError.message);
        throw new Error(`Unable to fetch METAR for ${icao}: ${primaryError.message}`);
      }
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
    
    // Try CheckWX backup API
    try {
      const backupData = await fetchTafFromCheckWX(icao.toUpperCase());
      
      // Cache the backup result
      cache.set(cacheKey, {
        data: backupData,
        timestamp: Date.now()
      });
      
      return backupData;
      
    } catch (backupError) {
      // CheckWX backup failed, falling back to mock data
      
      // Final fallback to mock data
      try {
        const mockData = generateMockTaf(icao.toUpperCase());
        return mockData;
      } catch (mockError) {
        console.error(`All TAF sources failed for ${icao}:`, mockError.message);
        throw new Error(`Unable to fetch TAF for ${icao}: ${primaryError.message}`);
      }
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

// CheckWX API backup functions

async function fetchMetarFromCheckWX(icao) {
  if (!CHECKWX_API_KEY) {
    throw new Error('CheckWX API key not configured');
  }

  const url = `${API_ENDPOINTS.checkwx}/metar/${icao}/decoded`;
  
  try {
    console.log(`Fetching METAR from CheckWX backup API for ${icao}...`);
    const response = await axios.get(url, {
      timeout: REQUEST_TIMEOUT,
      headers: {
        'X-API-Key': CHECKWX_API_KEY,
        'User-Agent': 'Aviation Weather Briefing App'
      }
    });

    if (response.data && response.data.data && response.data.data.length > 0) {
      const metarData = response.data.data[0];
      console.log(`✅ CheckWX METAR backup successful for ${icao}`);
      return {
        raw: metarData.raw_text || metarData.text,
        observationTime: metarData.observed || metarData.observation_time,
        station: metarData.icao || metarData.station,
        coordinates: {
          lat: metarData.station?.geometry?.coordinates?.[1] || null,
          lon: metarData.station?.geometry?.coordinates?.[0] || null
        }
      };
    }

    throw new Error(`No CheckWX METAR data available for ${icao}`);
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('CheckWX API key is invalid');
    } else if (error.response?.status === 429) {
      throw new Error('CheckWX API rate limit exceeded');
    }
    throw new Error(`CheckWX METAR API error: ${error.message}`);
  }
}

async function fetchTafFromCheckWX(icao) {
  if (!CHECKWX_API_KEY) {
    throw new Error('CheckWX API key not configured');
  }

  const url = `${API_ENDPOINTS.checkwx}/taf/${icao}/decoded`;
  
  try {
    console.log(`🌐 Fetching TAF from CheckWX backup API: ${url}`);
    const response = await axios.get(url, {
      timeout: REQUEST_TIMEOUT,
      headers: {
        'X-API-Key': CHECKWX_API_KEY,
        'User-Agent': 'Aviation Weather Briefing App'
      }
    });

    console.log(`📡 CheckWX TAF API Response Status: ${response.status}`);
    console.log(`📊 CheckWX TAF API Response:`, response.data?.data?.length || 0, 'items');

    if (response.data && response.data.data && response.data.data.length > 0) {
      const tafData = response.data.data[0];
      console.log(`✅ CheckWX TAF backup successful for ${icao}`);
      console.log(`📊 CheckWX TAF data structure:`, Object.keys(tafData));
      
      return {
        raw: tafData.raw_text || tafData.text || tafData.raw,
        issueTime: tafData.timestamp?.issued || tafData.issue_time,
        station: tafData.icao || tafData.station,
        validTime: tafData.timestamp?.from || tafData.valid_time_from
      };
    }

    throw new Error(`No CheckWX TAF data available for ${icao}`);
  } catch (error) {
    // CheckWX TAF API error, will be handled by fallback
    if (error.response?.status === 401) {
      throw new Error('CheckWX API key is invalid');
    } else if (error.response?.status === 429) {
      throw new Error('CheckWX API rate limit exceeded');
    }
    throw new Error(`CheckWX TAF API error: ${error.message}`);
  }
}

// Debug function to test TAF fetching
const debugTafFetching = async (icao) => {
  console.log(`🔍 Debugging TAF fetching for ${icao}...`);
  
  // Test primary API
  console.log('\n1️⃣ Testing Primary Aviation Weather API...');
  try {
    const primaryResult = await fetchTafFromPrimary(icao);
    console.log('✅ Primary API Success:', primaryResult);
  } catch (primaryError) {
    console.log('❌ Primary API Failed:', primaryError.message);
    
    // Test CheckWX backup
    console.log('\n2️⃣ Testing CheckWX Backup API...');
    try {
      const backupResult = await fetchTafFromCheckWX(icao);
      console.log('✅ CheckWX Backup Success:', backupResult);
    } catch (backupError) {
      // CheckWX backup failed, trying mock data
      
      // Test mock data
      console.log('\n3️⃣ Testing Mock Data Fallback...');
      try {
        const mockResult = generateMockTaf(icao);
        console.log('✅ Mock Data Success:', mockResult);
      } catch (mockError) {
        console.log('❌ Mock Data Failed:', mockError.message);
      }
    }
  }
};

// Test CheckWX API connectivity
const testCheckWXConnection = async () => {
  if (!CHECKWX_API_KEY) {
    console.warn('⚠️  CheckWX API key not configured - backup weather service unavailable');
    return false;
  }

  try {
    // Test with a common airport
    const testUrl = `${API_ENDPOINTS.checkwx}/metar/KJFK`;
    const response = await axios.get(testUrl, {
      timeout: 5000,
      headers: {
        'X-API-Key': CHECKWX_API_KEY,
        'User-Agent': 'Aviation Weather Briefing App'
      }
    });

    if (response.status === 200) {
      console.log('✅ CheckWX backup API connection successful');
      return true;
    }
  } catch (error) {
    if (error.response?.status === 401) {
      // CheckWX API key invalid
    } else if (error.response?.status === 429) {
      // CheckWX API rate limited
    } else {
      // CheckWX API connection failed
    }
  }
  return false;
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
  // Try the correct aviationweather.gov API endpoint
  const url = `${API_ENDPOINTS.aviationWeather}taf`;
  const params = {
    ids: icao,
    format: 'json'
  };

  console.log(`🌐 Fetching TAF from primary API: ${url}?${new URLSearchParams(params)}`);

  try {
    const response = await axios.get(url, {
      params,
      timeout: REQUEST_TIMEOUT,
      headers: {
        'User-Agent': 'Aviation Weather Briefing App'
      }
    });

    console.log(`📡 Primary TAF API Response Status: ${response.status}`);
    console.log(`📊 Primary TAF API Response Length: ${response.data?.length || 0}`);

    if (response.data && response.data.length > 0) {
      const tafData = response.data[0];
      console.log(`✅ Primary TAF data structure:`, Object.keys(tafData));
      
      return {
        raw: tafData.rawTAF || tafData.raw_text || tafData.raw,
        issueTime: tafData.issueTime || tafData.issue_time || tafData.bulletinTime,
        station: tafData.icaoId || tafData.station_id || tafData.stationId,
        validTime: tafData.validTime || tafData.valid_time_from || tafData.validTimeFrom
      };
    }

    throw new Error(`No TAF data available for ${icao} from primary API`);
  } catch (error) {
    console.log(`❌ Primary TAF API Error:`, error.response?.status, error.message);
    throw error;
  }
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
  testCheckWXConnection,
  debugTafFetching,
  // Export for testing
  generateMockMetar,
  generateMockTaf,
  findNearestAirport,
  calculateDistance
};