// Enhanced API wrapper for aviation weather briefing frontend
import axios, { AxiosError } from "axios";

// Type definitions
interface FlightPlanPayload {
  origin: string;
  destination: string;
  altitude?: number;
}

interface WeatherPayload {
  waypoints?: Array<{ lat: number; lon: number }>;
  radius?: number;
  region?: string;
  validTime?: string;
}

interface NotamPayload {
  notamText?: string;
  icao?: string;
  weatherData?: unknown;
}

interface AirportPayload {
  airports: string[];
}

interface BriefingPayload extends FlightPlanPayload {
  departureTime?: string;
}

// Base URLs from environment variables
const NODE_API_BASE = process.env.NEXT_PUBLIC_NODE_API_BASE || "http://localhost:5000/api";
const PYTHON_NLP_BASE = process.env.NEXT_PUBLIC_PYTHON_NLP_BASE || "http://localhost:8000";

// Create axios instances for different backends
const nodeClient = axios.create({
  baseURL: NODE_API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const pythonClient = axios.create({
  baseURL: PYTHON_NLP_BASE,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request/Response interceptors for error handling
nodeClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.error('Node API Error:', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);

pythonClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.error('Python NLP API Error:', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Flight Plan API calls
export const flightPlanAPI = {
  /**
   * Generate waypoints for flight route
   * @param {Object} payload - { origin, destination, altitude? }
   */
  generateWaypoints: async (payload: FlightPlanPayload) => {
    try {
      const response = await nodeClient.post('/flightplan', payload);
      return response.data;
    } catch (error) {
      console.warn('Flight plan generation failed, using fallback');
      return _generateFallbackWaypoints(payload);
    }
  },

  /**
   * Get route analysis with weather and NOTAMs
   * @param {Object} payload - { waypoints, altitude }
   */
  analyzeRoute: async (payload: WeatherPayload) => {
    try {
      const response = await nodeClient.post('/flightplan/analyze', payload);
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof AxiosError ? error.message : 'Unknown error';
      console.warn('Route analysis failed:', message);
      throw error;
    }
  }
};

// Weather API calls
export const weatherAPI = {

  /**
   * Fetch latest METAR for an airport by ICAO
   * @param {string} icao - ICAO code
   * @returns {Promise<{raw: string, ...}>}
   */
  getLatestMetar: async (icao: string) => {
    if (!icao || icao.length !== 4) throw new Error('Valid ICAO required');
    try {
      const response = await nodeClient.get(`/weather/current/${icao}`);
      // Return the raw METAR string for compatibility
      return response.data.current?.raw ? { raw: response.data.current.raw } : { raw: 'N/A' };
    } catch (error: unknown) {
      const message = error instanceof AxiosError ? error.message : 'Unknown error';
      console.warn('getLatestMetar failed:', message);
      return { raw: 'N/A' };
    }
  },

  /**
   * Fetch latest TAF for an airport by ICAO
   * @param {string} icao - ICAO code
   * @returns {Promise<{raw: string, ...}>}
   */
  getLatestTaf: async (icao: string) => {
    if (!icao || icao.length !== 4) throw new Error('Valid ICAO required');
    try {
      const response = await nodeClient.get(`/weather/forecast/${icao}`);
      // Return the full forecast object with NLP enhancements
      return response.data.forecast ? response.data.forecast : { raw: 'N/A' };
    } catch (error: unknown) {
      const message = error instanceof AxiosError ? error.message : 'Unknown error';
      console.warn('getLatestTaf failed:', message);
      return { raw: 'N/A' };
    }
  },

  /**
   * Decode METAR data
   * @param {Object} payload - { metarString, icao }
   */
  decodeMetar: async (payload: NotamPayload) => {
    try {
      const response = await nodeClient.post('/weather/metar', payload);
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof AxiosError ? error.message : 'Unknown error';
      console.warn('METAR decode failed:', message);
      return _fallbackMetarDecode(payload);
    }
  },

  /**
   * Decode TAF data
   * @param {Object} payload - { tafString, icao }
   */
  decodeTaf: async (payload: NotamPayload) => {
    try {
      const response = await nodeClient.post('/weather/taf', payload);
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof AxiosError ? error.message : 'Unknown error';
      console.warn('TAF decode failed:', message);
      return _fallbackTafDecode(payload);
    }
  },

  /**
   * Get weather along route
   * @param {Object} payload - { waypoints, radius }
   */
  getRouteWeather: async (payload: WeatherPayload) => {
    try {
      const response = await nodeClient.post('/weather/route', payload);
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof AxiosError ? error.message : 'Unknown error';
      console.warn('Route weather failed:', message);
      throw error;
    }
  },

  /**
   * Get SIGMET data
   * @param {Object} payload - { region, validTime }
   */
  getSigmets: async (payload: WeatherPayload) => {
    try {
      const response = await nodeClient.post('/weather/sigmet', payload);
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof AxiosError ? error.message : 'Unknown error';
      console.warn('SIGMET fetch failed:', message);
      return { sigmets: [], success: false };
    }
  }
};

// NOTAM API calls (through Node.js backend)
export const notamAPI = {
  /**
   * Get NOTAMs for airport
   * @param {string} icao - Airport ICAO code
   */
  getAirportNotams: async (icao: string) => {
    try {
      const response = await nodeClient.get(`/notam/${icao}`);
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof AxiosError ? error.message : 'Unknown error';
      console.warn('NOTAM fetch failed:', message);
      return { notams: [], success: false };
    }
  },

  /**
   * Parse single NOTAM using Python NLP service (via Node.js)
   * @param {Object} payload - { notamText, icao }
   */
  parseNotam: async (payload: NotamPayload) => {
    try {
      const response = await nodeClient.post('/notam/parse-single', payload);
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof AxiosError ? error.message : 'Unknown error';
      console.warn('NOTAM parsing failed:', message);
      throw error;
    }
  },

  /**
   * Summarize NOTAMs and weather using Python NLP service (via Node.js)
   * @param {Object} payload - { notamText?, weatherData?, icao }
   */
  summarizeData: async (payload: NotamPayload) => {
    try {
      const response = await nodeClient.post('/notam/summarize', payload);
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof AxiosError ? error.message : 'Unknown error';
      console.warn('Data summarization failed:', message);
      throw error;
    }
  },

  /**
   * Get critical NOTAMs for route
   * @param {Object} payload - { waypoints, filters }
   */
  getRouteCriticalNotams: async (payload: WeatherPayload) => {
    try {
      const response = await nodeClient.post('/notam/route-critical', payload);
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof AxiosError ? error.message : 'Unknown error';
      console.warn('Route critical NOTAMs failed:', message);
      return { notams: [], success: false };
    }
  }
};

// Airport API calls
export const airportAPI = {
  /**
   * Get airport coordinates by ICAO/IATA code
   * @param {string} code - Airport code (ICAO/IATA/GPS)
   */
  getCoordinates: async (code: string) => {
    try {
      const response = await nodeClient.get(`/airports/coordinates/${code}`);
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof AxiosError ? error.message : 'Unknown error';
      console.warn('Airport coordinates lookup failed:', message);
      throw error;
    }
  },

  /**
   * Get full airport information
   * @param {string} code - Airport code (ICAO/IATA/GPS)
   */
  getAirportInfo: async (code: string) => {
    try {
      const response = await nodeClient.get(`/airports/lookup/${code}`);
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof AxiosError ? error.message : 'Unknown error';
      console.warn('Airport lookup failed:', message);
      throw error;
    }
  },

  /**
   * Get coordinates for multiple airports (route planning)
   * @param {string[]} codes - Array of airport codes
   */
  getRouteCoordinates: async (codes: string[]) => {
    try {
      const response = await nodeClient.post('/airports/route-coordinates', {
        airports: codes
      });
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof AxiosError ? error.message : 'Unknown error';
      console.warn('Route coordinates lookup failed:', message);
      throw error;
    }
  },

  /**
   * Calculate distance between two airports
   * @param {string} from - Origin airport code
   * @param {string} to - Destination airport code
   */
  calculateDistance: async (from: string, to: string) => {
    try {
      const response = await nodeClient.get(`/airports/distance/${from}/${to}`);
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof AxiosError ? error.message : 'Unknown error';
      console.warn('Distance calculation failed:', message);
      throw error;
    }
  },

  /**
   * Search airports by name
   * @param {string} query - Search query
   * @param {number} limit - Maximum results (default: 10)
   */
  searchByName: async (query: string, limit: number = 10) => {
    try {
      const response = await nodeClient.get(`/airports/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof AxiosError ? error.message : 'Unknown error';
      console.warn('Airport search failed:', message);
      throw error;
    }
  },

  /**
   * Find nearby airports
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {number} radius - Radius in km (default: 50)
   * @param {number} limit - Maximum results (default: 10)
   */
  findNearby: async (lat: number, lon: number, radius: number = 50, limit: number = 10) => {
    try {
      const response = await nodeClient.get(`/airports/nearby?lat=${lat}&lon=${lon}&radius=${radius}&limit=${limit}`);
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof AxiosError ? error.message : 'Unknown error';
      console.warn('Nearby airports search failed:', message);
      throw error;
    }
  },

  /**
   * Get airport database statistics
   */
  getStats: async () => {
    try {
      const response = await nodeClient.get('/airports/stats');
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof AxiosError ? error.message : 'Unknown error';
      console.warn('Airport stats failed:', message);
      throw error;
    }
  }
};

// Combined workflow API
export const briefingAPI = {
  /**
   * Get complete flight briefing
   * @param {Object} payload - { origin, destination, altitude, departureTime }
   */
  getFlightBriefing: async (payload: BriefingPayload) => {
    try {
      // Call the flight plan generation endpoint which includes briefing data
      const response = await nodeClient.post('/flightplan/generate', {
        origin: payload.origin,
        destination: payload.destination,
        altitude: payload.altitude || 35000
      });
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof AxiosError ? error.message : 'Unknown error';
      console.error('Complete briefing failed:', message);
      throw error;
    }
  }
};

// Legacy function for backward compatibility
export async function parseWeather(payload: NotamPayload) {
  return weatherAPI.decodeMetar(payload);
}

// Fallback functions for offline/error scenarios
function _generateFallbackWaypoints(payload: FlightPlanPayload) {
  return {
    success: false,
    waypoints: [
      { lat: 40.6413, lon: -73.7781, name: payload.origin, type: 'departure' },
      { lat: 37.6213, lon: -122.3790, name: payload.destination, type: 'arrival' }
    ],
    distance: 2586, // approximate miles
    estimatedTime: '5h 30m',
    warning: 'Using fallback waypoints - backend unavailable'
  };
}

function _fallbackMetarDecode(payload: NotamPayload) {
  return {
    success: false,
    raw: (payload as { metarString?: string }).metarString || 'N/A',
    decoded: {
      station: payload.icao || 'UNKNOWN',
      conditions: 'Backend unavailable'
    },
    humanReadable: 'Weather data processing unavailable',
    warning: 'Backend service not reachable'
  };
}

function _fallbackTafDecode(payload: NotamPayload) {
  return {
    success: false,
    raw: (payload as { tafString?: string }).tafString || 'N/A',
    decoded: {
      station: payload.icao || 'UNKNOWN',
      forecast: 'Backend unavailable'
    },
    humanReadable: 'Forecast processing unavailable',
    warning: 'Backend service not reachable'
  };
}

// Export everything for easy access
export default {
  flightPlan: flightPlanAPI,
  weather: weatherAPI,
  notam: notamAPI,
  briefing: briefingAPI
};
