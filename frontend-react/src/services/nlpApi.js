// Direct Python NLP Service API
import axios from "axios";

// Python NLP service base URL
const PYTHON_NLP_BASE = import.meta.env.VITE_PYTHON_NLP_BASE || "http://localhost:8000";

// Create axios instance for Python NLP service
const nlpClient = axios.create({
  baseURL: PYTHON_NLP_BASE,
  timeout: 25000, // Longer timeout for NLP processing
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
nlpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Python NLP Service Error:', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Direct NLP API calls (bypassing Node.js backend)
export const nlpAPI = {
  /**
   * Parse NOTAM text directly using Python NLP service
   * @param {Object} payload - { notam_text, airport_code }
   */
  parseNotamDirect: async (payload) => {
    try {
      const response = await nlpClient.post('/nlp/parse-notam', {
        notam_text: payload.notam_text || payload.notamText,
        airport_code: payload.airport_code || payload.icao
      });
      return {
        success: true,
        data: response.data,
        source: 'Python NLP Service'
      };
    } catch (error) {
      console.warn('Direct NOTAM parsing failed:', error.message);
      
      // Return fallback parsing
      return {
        success: false,
        data: _fallbackParseNotam(payload),
        source: 'Fallback Parser',
        error: error.message
      };
    }
  },

  /**
   * Summarize data directly using Python NLP service
   * @param {Object} payload - { notam_text?, weather_data?, airport_code? }
   */
  summarizeDirect: async (payload) => {
    try {
      const response = await nlpClient.post('/nlp/summarize', {
        notam_text: payload.notam_text || payload.notamText,
        weather_data: payload.weather_data || payload.weatherData,
        airport_code: payload.airport_code || payload.icao
      });
      return {
        success: true,
        data: response.data,
        source: 'Python NLP Service'
      };
    } catch (error) {
      console.warn('Direct summarization failed:', error.message);
      
      // Return fallback summary
      return {
        success: false,
        data: _fallbackSummarize(payload),
        source: 'Fallback Summarizer',
        error: error.message
      };
    }
  },

  /**
   * Check health of Python NLP service
   */
  checkHealth: async () => {
    try {
      const response = await nlpClient.get('/');
      return {
        healthy: true,
        service: response.data.service,
        version: response.data.version,
        endpoints: response.data.endpoints
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        service: 'Python NLP Service'
      };
    }
  },

  /**
   * Batch process multiple NOTAMs
   * @param {Array} notams - Array of NOTAM objects with text
   */
  batchParseNotams: async (notams) => {
    const results = [];
    
    // Process in parallel with limit
    const batchSize = 3;
    for (let i = 0; i < notams.length; i += batchSize) {
      const batch = notams.slice(i, i + batchSize);
      const batchPromises = batch.map(async (notam, index) => {
        try {
          const result = await nlpAPI.parseNotamDirect({
            notam_text: notam.text || notam.notam_text,
            airport_code: notam.icao || notam.airport_code
          });
          return {
            index: i + index,
            original: notam,
            parsed: result.data,
            success: result.success,
            source: result.source
          };
        } catch (error) {
          return {
            index: i + index,
            original: notam,
            parsed: null,
            success: false,
            error: error.message
          };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(r => r.status === 'fulfilled' ? r.value : r.reason));
    }
    
    return {
      results,
      total: notams.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };
  },

  /**
   * Generate comprehensive briefing summary
   * @param {Object} briefingData - Complete flight briefing data
   */
  generateBriefingSummary: async (briefingData) => {
    try {
      // Prepare comprehensive text for summarization
      const weatherText = _extractWeatherText(briefingData.weather);
      const notamText = _extractNotamText(briefingData.notams);
      const routeText = _extractRouteText(briefingData.flightPlan);
      
      const combinedText = `
FLIGHT ROUTE: ${routeText}
WEATHER CONDITIONS: ${weatherText}
NOTAM INFORMATION: ${notamText}
      `.trim();
      
      const response = await nlpClient.post('/nlp/summarize', {
        notam_text: combinedText,
        airport_code: briefingData.flightPlan?.origin || 'UNKNOWN'
      });
      
      return {
        success: true,
        briefingSummary: response.data.summary,
        keyPoints: response.data.key_points || [],
        severity: response.data.severity || 'MEDIUM',
        recommendations: response.data.recommendations || [],
        processedAt: new Date().toISOString(),
        source: 'Python NLP Service'
      };
      
    } catch (error) {
      console.warn('Briefing summary generation failed:', error.message);
      
      return {
        success: false,
        briefingSummary: _generateFallbackBriefingSummary(briefingData),
        keyPoints: _extractBasicKeyPoints(briefingData),
        severity: 'MEDIUM',
        recommendations: ['Review all weather and NOTAM information carefully'],
        processedAt: new Date().toISOString(),
        source: 'Fallback Generator',
        error: error.message
      };
    }
  }
};

// Fallback functions
function _fallbackParseNotam(payload) {
  const text = payload.notam_text || payload.notamText || '';
  const upperText = text.toUpperCase();
  
  return {
    success: true,
    notam_id: null,
    effective_date: null,
    expiry_date: null,
    location: payload.airport_code || payload.icao || 'UNKNOWN',
    subject: upperText.includes('RUNWAY') ? 'RUNWAY' : 'GENERAL',
    description: text,
    severity: upperText.includes('CLOSED') ? 'HIGH' : 'MEDIUM',
    category: 'GENERAL',
    processed_by: 'Fallback Parser',
    processed_at: new Date().toISOString()
  };
}

function _fallbackSummarize(payload) {
  const text = payload.notam_text || payload.notamText || JSON.stringify(payload.weather_data || {});
  
  return {
    success: true,
    summary: text.slice(0, 200) + (text.length > 200 ? '...' : ''),
    key_points: ['Backend service unavailable', 'Using basic text processing'],
    severity: 'MEDIUM',
    recommendations: ['Verify information with official sources'],
    processed_by: 'Fallback Summarizer',
    processed_at: new Date().toISOString()
  };
}

function _extractWeatherText(weatherData) {
  if (!weatherData) return 'No weather data available';
  
  const parts = [];
  if (weatherData.metar) parts.push(`METAR: ${weatherData.metar}`);
  if (weatherData.taf) parts.push(`TAF: ${weatherData.taf}`);
  if (weatherData.sigmets) parts.push(`SIGMETs: ${weatherData.sigmets.length} active`);
  
  return parts.join(' | ') || 'Weather data processing unavailable';
}

function _extractNotamText(notamData) {
  if (!notamData) return 'No NOTAM data available';
  
  const allNotams = [
    ...(notamData.origin?.notams || []),
    ...(notamData.destination?.notams || []),
    ...(notamData.route?.notams || [])
  ];
  
  return allNotams.map(n => n.text || n.description || 'NOTAM text unavailable').join(' | ');
}

function _extractRouteText(flightPlan) {
  if (!flightPlan || !flightPlan.waypoints) return 'Route information unavailable';
  
  const waypoints = flightPlan.waypoints;
  if (waypoints.length >= 2) {
    return `${waypoints[0].name} to ${waypoints[waypoints.length - 1].name} via ${waypoints.length} waypoints`;
  }
  
  return 'Route details unavailable';
}

function _generateFallbackBriefingSummary(briefingData) {
  const parts = [
    briefingData.flightPlan ? `Flight route planned` : 'Route planning required',
    briefingData.weather ? `Weather data available` : 'Weather information needed',
    briefingData.notams ? `NOTAMs reviewed` : 'NOTAM review required'
  ];
  
  return `Flight briefing summary: ${parts.join(', ')}. Please verify all information with official aviation sources.`;
}

function _extractBasicKeyPoints(briefingData) {
  const keyPoints = [];
  
  if (briefingData.weather) keyPoints.push('Weather conditions reviewed');
  if (briefingData.notams) keyPoints.push('NOTAMs identified for route');
  if (briefingData.flightPlan) keyPoints.push('Flight plan waypoints generated');
  if (!keyPoints.length) keyPoints.push('Limited briefing data available');
  
  return keyPoints;
}

export default nlpAPI;