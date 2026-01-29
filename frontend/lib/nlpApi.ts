// Direct Python NLP Service API
import axios from "axios";

// Python NLP service base URL
const PYTHON_NLP_BASE = process.env.NEXT_PUBLIC_PYTHON_NLP_BASE || "http://localhost:8000";

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
  parseNotamDirect: async (payload: { notam_text?: string; notamText?: string; airport_code?: string; icao?: string }) => {
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
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.warn('Direct NOTAM parsing failed:', message);
      
      // Return fallback parsing
      return {
        success: false,
        data: _fallbackParseNotam(payload),
        source: 'Fallback Parser',
        error: message
      };
    }
  },

  /**
   * Summarize data directly using Python NLP service
   * @param {Object} payload - { notam_text?, weather_data?, airport_code? }
   */
  summarizeDirect: async (payload: { notam_text?: string; notamText?: string; weather_data?: Record<string, unknown>; weatherData?: Record<string, unknown>; airport_code?: string; icao?: string }) => {
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
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.warn('Direct summarization failed:', message);
      
      // Return fallback summary
      return {
        success: false,
        data: _fallbackSummarize(payload),
        source: 'Fallback Summarizer',
        error: message
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
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        healthy: false,
        error: message,
        service: 'Python NLP Service'
      };
    }
  },

  /**
   * Batch process multiple NOTAMs
   * @param {Array} notams - Array of NOTAM objects with text
   */
  batchParseNotams: async (notams: Array<{ text?: string; notam_text?: string; icao?: string; airport_code?: string }>) => {
    const results = [];
    
    // Process in parallel with limit
    const batchSize = 3;
    for (let i = 0; i < notams.length; i += batchSize) {
      const batch = notams.slice(i, i + batchSize);
      const batchPromises = batch.map(async (notam: typeof notams[0], index: number) => {
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
          const message = error instanceof Error ? error.message : 'Unknown error occurred';
          return {
            index: i + index,
            original: notam,
            parsed: null,
            success: false,
            error: message
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
  generateBriefingSummary: async (briefingData: Record<string, unknown>) => {
    try {
      // Prepare comprehensive text for summarization
      const weatherText = _extractWeatherText(briefingData.weather as Record<string, unknown> | undefined);
      const notamText = _extractNotamText(briefingData.notams as Record<string, unknown> | undefined);
      const routeText = _extractRouteText(briefingData.flightPlan as Record<string, unknown> | undefined);
      
      const combinedText = `
FLIGHT ROUTE: ${routeText}
WEATHER CONDITIONS: ${weatherText}
NOTAM INFORMATION: ${notamText}
      `.trim();
      
      const response = await nlpClient.post('/nlp/summarize', {
        notam_text: combinedText,
        airport_code: (briefingData.flightPlan as Record<string, unknown> | undefined)?.origin || 'UNKNOWN'
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
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.warn('Briefing summary generation failed:', message);
      
      return {
        success: false,
        briefingSummary: _generateFallbackBriefingSummary(briefingData),
        keyPoints: _extractBasicKeyPoints(briefingData),
        severity: 'MEDIUM',
        recommendations: ['Review all weather and NOTAM information carefully'],
        processedAt: new Date().toISOString(),
        source: 'Fallback Generator',
        error: message
      };
    }
  }
};

// Fallback functions
function _fallbackParseNotam(payload: { notam_text?: string; notamText?: string; airport_code?: string; icao?: string }) {
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

function _fallbackSummarize(payload: { notam_text?: string; notamText?: string; weather_data?: Record<string, unknown>; weatherData?: Record<string, unknown> }) {
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

function _extractWeatherText(weatherData: Record<string, unknown> | undefined) {
  if (!weatherData) return 'No weather data available';
  
  const parts = [];
  if (weatherData.metar) parts.push(`METAR: ${weatherData.metar}`);
  if (weatherData.taf) parts.push(`TAF: ${weatherData.taf}`);
  if (Array.isArray(weatherData.sigmets)) parts.push(`SIGMETs: ${(weatherData.sigmets as unknown[]).length} active`);
  
  return parts.join(' | ') || 'Weather data processing unavailable';
}

function _extractNotamText(notamData: Record<string, unknown> | undefined) {
  if (!notamData) return 'No NOTAM data available';
  
  const allNotams = [
    ...(((notamData.origin as Record<string, unknown> | undefined)?.notams as unknown[]) || []),
    ...(((notamData.destination as Record<string, unknown> | undefined)?.notams as unknown[]) || []),
    ...(((notamData.route as Record<string, unknown> | undefined)?.notams as unknown[]) || [])
  ];
  
  return allNotams.map((n: unknown) => {
    const notam = n as Record<string, unknown> | undefined;
    return notam?.text || notam?.description || 'NOTAM text unavailable';
  }).join(' | ');
}

function _extractRouteText(flightPlan: Record<string, unknown> | undefined) {
  if (!flightPlan) return 'Route information unavailable';
  
  const waypoints = flightPlan.waypoints as Record<string, unknown>[] | undefined;
  if (!Array.isArray(waypoints) || waypoints.length < 2) return 'Route details unavailable';
  
  const firstWaypoint = waypoints[0] as Record<string, unknown>;
  const lastWaypoint = waypoints[waypoints.length - 1] as Record<string, unknown>;
  return `${firstWaypoint.name} to ${lastWaypoint.name} via ${waypoints.length} waypoints`;
}

function _generateFallbackBriefingSummary(briefingData: Record<string, unknown>) {
  const parts = [
    briefingData.flightPlan ? `Flight route planned` : 'Route planning required',
    briefingData.weather ? `Weather data available` : 'Weather information needed',
    briefingData.notams ? `NOTAMs reviewed` : 'NOTAM review required'
  ];
  
  return `Flight briefing summary: ${parts.join(', ')}. Please verify all information with official aviation sources.`;
}

function _extractBasicKeyPoints(briefingData: Record<string, unknown>) {
  const keyPoints = [];
  
  if (briefingData.weather) keyPoints.push('Weather conditions reviewed');
  if (briefingData.notams) keyPoints.push('NOTAMs identified for route');
  if (briefingData.flightPlan) keyPoints.push('Flight plan waypoints generated');
  if (!keyPoints.length) keyPoints.push('Limited briefing data available');
  
  return keyPoints;
}

export default nlpAPI;
