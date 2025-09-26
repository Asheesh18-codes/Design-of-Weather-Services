const axios = require('axios');

// Parse NOTAMs using Python NLP service
const parseNotam = async (req, res) => {
  try {
    const { notamText, icao } = req.body;

    if (!notamText) {
      return res.status(400).json({
        error: 'NOTAM text is required for parsing'
      });
    }

    // Forward to Python NLP microservice for parsing
    const pythonBackendUrl = process.env.PYTHON_NLP_URL || 'http://localhost:8000';
    
    try {
      const nlpResponse = await axios.post(`${pythonBackendUrl}/nlp/parse-notam`, {
        notam_text: notamText,
        airport_code: icao
      }, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const parsedData = nlpResponse.data;

      res.json({
        success: true,
        original: notamText,
        parsed: parsedData,
        icao: icao || 'N/A',
        processedBy: 'Python NLP Service',
        processedAt: new Date().toISOString()
      });

    } catch (nlpError) {
      console.warn('NLP parsing service unavailable, using fallback:', nlpError.message);
      
      // Fallback parsing when Python service is unavailable
      const fallbackParsed = {
        notam_id: extractNotamId(notamText),
        effective_date: extractEffectiveDate(notamText),
        expiry_date: extractExpiryDate(notamText),
        location: icao || extractLocation(notamText),
        subject: categorizeNotam(notamText),
        description: generateFallbackSummary(notamText),
        coordinates: extractCoordinates(notamText),
        altitude_affected: extractAltitude(notamText),
        severity: assessSeverityFromText(notamText)
      };

      res.json({
        success: true,
        original: notamText,
        parsed: fallbackParsed,
        icao: icao || 'N/A',
        processedBy: 'Fallback Parser',
        processedAt: new Date().toISOString(),
        warning: 'NLP parsing service unavailable, using basic text analysis'
      });
    }

  } catch (error) {
    console.error('NOTAM parsing error:', error);
    res.status(500).json({
      error: 'Failed to parse NOTAM',
      message: error.message
    });
  }
};

// Summarize NOTAMs using external NLP service (Python backend)
const summarize = async (req, res) => {
  try {
    const { notamText, weatherData, icao } = req.body;

    if (!notamText && !weatherData) {
      return res.status(400).json({
        error: 'NOTAM text or weather data is required for summarization'
      });
    }

    // Forward to Python NLP microservice for summarization
    const pythonBackendUrl = process.env.PYTHON_NLP_URL || 'http://localhost:8000';
    
    try {
      const nlpResponse = await axios.post(`${pythonBackendUrl}/nlp/summarize`, {
        notam_text: notamText,
        weather_data: weatherData,
        airport_code: icao
      }, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const summary = nlpResponse.data;

      res.json({
        success: true,
        original: {
          notam: notamText,
          weather: weatherData
        },
        summary: summary.summary || generateFallbackSummary(notamText || JSON.stringify(weatherData)),
        keyPoints: summary.key_points || extractKeyPoints(notamText || JSON.stringify(weatherData)),
        severity: summary.severity || 'MEDIUM',
        recommendations: summary.recommendations || [],
        icao: icao || 'N/A',
        processedBy: 'Python NLP Service',
        processedAt: new Date().toISOString()
      });

    } catch (nlpError) {
      console.warn('NLP summarization service unavailable, using fallback:', nlpError.message);
      
      // Fallback processing when Python service is unavailable
      const text = notamText || JSON.stringify(weatherData);
      const fallbackSummary = {
        summary: generateFallbackSummary(text),
        keyPoints: extractKeyPoints(text),
        severity: assessSeverityFromText(text),
        recommendations: generateBasicRecommendations(text)
      };

      res.json({
        success: true,
        original: {
          notam: notamText,
          weather: weatherData
        },
        ...fallbackSummary,
        icao: icao || 'N/A',
        processedBy: 'Fallback Parser',
        processedAt: new Date().toISOString(),
        warning: 'NLP service unavailable, using basic text analysis'
      });
    }

  } catch (error) {
    console.error('NOTAM summarization error:', error);
    res.status(500).json({
      error: 'Failed to summarize NOTAM/Weather data',
      message: error.message
    });
  }
};

// Get NOTAMs for specific airport
const getNotams = async (req, res) => {
  try {
    const { icao } = req.params;
    const { category, active = true } = req.query;

    if (!icao || icao.length !== 4) {
      return res.status(400).json({
        error: 'Valid 4-letter ICAO airport code is required'
      });
    }

    // Mock NOTAM data - in real implementation, this would fetch from FAA or other NOTAM service
    const mockNotams = generateMockNotams(icao.toUpperCase());
    
    // Filter by category if specified
    let filteredNotams = mockNotams;
    if (category) {
      filteredNotams = mockNotams.filter(notam => 
        notam.category.toLowerCase().includes(category.toLowerCase())
      );
    }

    // Filter by active status
    if (active) {
      const now = new Date();
      filteredNotams = filteredNotams.filter(notam => 
        new Date(notam.effectiveFrom) <= now && 
        new Date(notam.effectiveTo) >= now
      );
    }

    res.json({
      success: true,
      airport: icao.toUpperCase(),
      notams: filteredNotams,
      totalCount: filteredNotams.length,
      filters: { category, active },
      fetchedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('NOTAM fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch NOTAMs',
      message: error.message,
      icao: req.params.icao
    });
  }
};

// Parse and categorize multiple NOTAMs
const parseNotams = async (req, res) => {
  try {
    const { notams } = req.body;

    if (!notams || !Array.isArray(notams)) {
      return res.status(400).json({
        error: 'Array of NOTAM texts is required'
      });
    }

    const parsedNotams = [];

    for (let i = 0; i < notams.length; i++) {
      const notamText = notams[i];
      
      try {
        const parsed = {
          id: `NOTAM_${i + 1}`,
          originalText: notamText,
          parsed: {
            type: extractNotamType(notamText),
            location: extractLocation(notamText),
            subject: extractSubject(notamText),
            condition: extractCondition(notamText),
            timeframe: extractTimeframe(notamText)
          },
          category: categorizeNotam(notamText),
          severity: assessSeverityFromText(notamText),
          affectedOperations: extractOperations(notamText),
          summary: generateFallbackSummary(notamText)
        };

        parsedNotams.push(parsed);

      } catch (parseError) {
        console.error(`Error parsing NOTAM ${i + 1}:`, parseError);
        parsedNotams.push({
          id: `NOTAM_${i + 1}`,
          originalText: notamText,
          error: `Failed to parse: ${parseError.message}`,
          category: 'UNKNOWN',
          severity: 'UNKNOWN'
        });
      }
    }

    // Generate overall analysis
    const analysis = {
      totalNotams: parsedNotams.length,
      categories: getCategoryDistribution(parsedNotams),
      severityBreakdown: getSeverityBreakdown(parsedNotams),
      criticalNotams: parsedNotams.filter(n => n.severity === 'HIGH').length,
      mostCommonType: getMostCommonType(parsedNotams)
    };

    res.json({
      success: true,
      parsedNotams,
      analysis,
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('NOTAM parsing error:', error);
    res.status(500).json({
      error: 'Failed to parse NOTAMs',
      message: error.message
    });
  }
};

// Get route-critical NOTAMs
const getRouteCriticalNotams = async (req, res) => {
  try {
    const { airports, route } = req.body;

    if (!airports || !Array.isArray(airports)) {
      return res.status(400).json({
        error: 'Array of airport ICAO codes is required'
      });
    }

    const criticalNotams = {
      routeAffecting: [],
      airportSpecific: {},
      summary: {
        totalCritical: 0,
        highSeverity: 0,
        runwayClosures: 0,
        navigationAids: 0
      }
    };

    // Process each airport
    for (const icao of airports) {
      const airportNotams = generateMockNotams(icao.toUpperCase());
      
      // Filter for critical NOTAMs
      const critical = airportNotams.filter(notam => 
        notam.severity === 'HIGH' || 
        notam.category.includes('RUNWAY') || 
        notam.category.includes('NAVAID')
      );

      criticalNotams.airportSpecific[icao.toUpperCase()] = critical;
      criticalNotams.summary.totalCritical += critical.length;
      criticalNotams.summary.highSeverity += critical.filter(n => n.severity === 'HIGH').length;
      criticalNotams.summary.runwayClosures += critical.filter(n => n.category.includes('RUNWAY')).length;
      criticalNotams.summary.navigationAids += critical.filter(n => n.category.includes('NAVAID')).length;

      // Check for route-affecting NOTAMs
      const routeAffecting = critical.filter(notam => 
        notam.affectedOperations.includes('DEPARTURE') || 
        notam.affectedOperations.includes('ARRIVAL') ||
        notam.affectedOperations.includes('ENROUTE')
      );

      criticalNotams.routeAffecting.push(...routeAffecting.map(notam => ({
        ...notam,
        airport: icao.toUpperCase()
      })));
    }

    // Generate recommendations
    const recommendations = [];
    if (criticalNotams.summary.runwayClosures > 0) {
      recommendations.push('⚠️ Runway closures detected - verify alternate runways available');
    }
    if (criticalNotams.summary.navigationAids > 0) {
      recommendations.push('📡 Navigation aid outages - ensure backup navigation capability');
    }
    if (criticalNotams.summary.highSeverity > 0) {
      recommendations.push('🚨 High severity NOTAMs present - review carefully before departure');
    }

    res.json({
      success: true,
      criticalNotams,
      recommendations,
      route: airports,
      analyzedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Route critical NOTAMs error:', error);
    res.status(500).json({
      error: 'Failed to analyze route-critical NOTAMs',
      message: error.message
    });
  }
};

// Helper functions for fallback processing
function generateFallbackSummary(notamText) {
  const text = notamText.toUpperCase();
  
  if (text.includes('RWY') && text.includes('CLSD')) {
    return 'Runway closure in effect';
  } else if (text.includes('NAVAID') || text.includes('ILS')) {
    return 'Navigation aid maintenance or outage';
  } else if (text.includes('TWY')) {
    return 'Taxiway restriction or closure';
  } else if (text.includes('APRON')) {
    return 'Apron or gate area restriction';
  } else if (text.includes('AIRSPACE')) {
    return 'Airspace restriction or closure';
  } else {
    return 'Airport operational notice - review full text';
  }
}

function extractKeyPoints(notamText) {
  const keyPoints = [];
  const text = notamText.toUpperCase();
  
  if (text.includes('RWY')) keyPoints.push('Runway operations affected');
  if (text.includes('CLSD') || text.includes('CLOSED')) keyPoints.push('Facility closure');
  if (text.includes('MAINT') || text.includes('MAINTENANCE')) keyPoints.push('Maintenance activity');
  if (text.includes('TEMPO') || text.includes('TEMPORARY')) keyPoints.push('Temporary restriction');
  if (text.includes('PERM') || text.includes('PERMANENT')) keyPoints.push('Permanent change');
  
  return keyPoints.length > 0 ? keyPoints : ['General operational notice'];
}

function assessSeverityFromText(notamText) {
  const text = notamText.toUpperCase();
  
  if (text.includes('EMERGENCY') || text.includes('DANGER') || 
      (text.includes('RWY') && text.includes('CLSD'))) {
    return 'HIGH';
  } else if (text.includes('CAUTION') || text.includes('RESTRICTED') || 
             text.includes('MAINT')) {
    return 'MEDIUM';
  } else {
    return 'LOW';
  }
}

function categorizeNotam(notamText) {
  const text = notamText.toUpperCase();
  
  if (text.includes('RWY')) return 'RUNWAY';
  if (text.includes('TWY')) return 'TAXIWAY';
  if (text.includes('APRON')) return 'APRON';
  if (text.includes('NAVAID') || text.includes('ILS')) return 'NAVAID';
  if (text.includes('AIRSPACE')) return 'AIRSPACE';
  if (text.includes('LIGHTING')) return 'LIGHTING';
  
  return 'GENERAL';
}

function extractOperations(notamText) {
  const operations = [];
  const text = notamText.toUpperCase();
  
  if (text.includes('DEPARTURE') || text.includes('TAKEOFF')) {
    operations.push('DEPARTURE');
  }
  if (text.includes('ARRIVAL') || text.includes('LANDING')) {
    operations.push('ARRIVAL');
  }
  if (text.includes('TAXI')) {
    operations.push('TAXI');
  }
  if (text.includes('ENROUTE') || text.includes('AIRSPACE')) {
    operations.push('ENROUTE');
  }
  
  return operations.length > 0 ? operations : ['GENERAL'];
}

function extractTimeframe(notamText) {
  // Simple regex to find date/time patterns
  const datePatterns = [
    /\d{2}\/\d{2}\/\d{4}/g,
    /\d{4}-\d{2}-\d{2}/g,
    /\d{2}\d{2}\d{2} \d{4}/g
  ];
  
  for (const pattern of datePatterns) {
    const matches = notamText.match(pattern);
    if (matches) {
      return `From ${matches[0]} ${matches[1] || 'until further notice'}`;
    }
  }
  
  if (notamText.toUpperCase().includes('TEMPO')) {
    return 'Temporary - check specific dates in NOTAM';
  } else if (notamText.toUpperCase().includes('PERM')) {
    return 'Permanent';
  }
  
  return 'See NOTAM for specific timeframe';
}

function extractNotamType(notamText) {
  const text = notamText.toUpperCase();
  if (text.startsWith('A') || text.includes(' A ')) return 'AIRSPACE';
  if (text.startsWith('E') || text.includes(' E ')) return 'EQUIPMENT';
  if (text.startsWith('R') || text.includes(' R ')) return 'RUNWAY';
  return 'GENERAL';
}

function extractLocation(notamText) {
  // Extract ICAO codes
  const icaoMatch = notamText.match(/[A-Z]{4}/);
  return icaoMatch ? icaoMatch[0] : 'UNKNOWN';
}

function extractSubject(notamText) {
  const text = notamText.toUpperCase();
  if (text.includes('RWY')) return 'RUNWAY OPERATIONS';
  if (text.includes('TWY')) return 'TAXIWAY OPERATIONS';
  if (text.includes('NAVAID')) return 'NAVIGATION AID';
  return 'GENERAL OPERATIONS';
}

function extractCondition(notamText) {
  const text = notamText.toUpperCase();
  if (text.includes('CLSD')) return 'CLOSED';
  if (text.includes('RESTRICTED')) return 'RESTRICTED';
  if (text.includes('MAINT')) return 'MAINTENANCE';
  return 'OPERATIONAL NOTICE';
}

function generateMockNotams(icao) {
  return [
    {
      id: `${icao}_001`,
      type: 'RUNWAY',
      category: 'RUNWAY',
      severity: 'HIGH',
      title: `Runway 09/27 closure for maintenance`,
      description: `${icao} RWY 09/27 CLSD FOR MAINT WEF 1200Z-1800Z DAILY`,
      effectiveFrom: new Date(Date.now() + 3600000).toISOString(),
      effectiveTo: new Date(Date.now() + 86400000).toISOString(),
      affectedOperations: ['DEPARTURE', 'ARRIVAL']
    },
    {
      id: `${icao}_002`,
      type: 'NAVAID',
      category: 'NAVAID',
      severity: 'MEDIUM',
      title: 'ILS approach unavailable',
      description: `${icao} ILS RWY 09 U/S FOR SCHEDULED MAINT`,
      effectiveFrom: new Date(Date.now() - 3600000).toISOString(),
      effectiveTo: new Date(Date.now() + 172800000).toISOString(),
      affectedOperations: ['ARRIVAL']
    },
    {
      id: `${icao}_003`,
      type: 'LIGHTING',
      category: 'LIGHTING',
      severity: 'LOW',
      title: 'Taxiway lighting reduced intensity',
      description: `${icao} TWY A EDGE LGT REDUCED INTENSITY`,
      effectiveFrom: new Date(Date.now() - 86400000).toISOString(),
      effectiveTo: new Date(Date.now() + 259200000).toISOString(),
      affectedOperations: ['TAXI']
    }
  ];
}

function getCategoryDistribution(notams) {
  const categories = {};
  notams.forEach(notam => {
    categories[notam.category] = (categories[notam.category] || 0) + 1;
  });
  return categories;
}

function getSeverityBreakdown(notams) {
  const severity = { HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
  notams.forEach(notam => {
    severity[notam.severity] = (severity[notam.severity] || 0) + 1;
  });
  return severity;
}

function getMostCommonType(notams) {
  const types = {};
  notams.forEach(notam => {
    if (notam.parsed && notam.parsed.type) {
      types[notam.parsed.type] = (types[notam.parsed.type] || 0) + 1;
    }
  });
  return Object.keys(types).reduce((a, b) => types[a] > types[b] ? a : b, 'GENERAL');
}

// Helper functions for fallback parsing
function extractNotamId(text) {
  const match = text.match(/([A-Z]\d{4}\/\d{2})/);
  return match ? match[1] : 'UNKNOWN';
}

function extractEffectiveDate(text) {
  const match = text.match(/(\d{10})/);
  return match ? new Date(match[1].slice(0, 2) + '20' + match[1].slice(2, 4) + '-' + 
    match[1].slice(4, 6) + '-' + match[1].slice(6, 8) + 'T' + 
    match[1].slice(8, 10) + ':00:00Z').toISOString() : null;
}

function extractExpiryDate(text) {
  const parts = text.split(' ');
  const tillIndex = parts.findIndex(p => p.includes('TILL'));
  if (tillIndex > -1 && parts[tillIndex + 1]) {
    return extractEffectiveDate(parts[tillIndex + 1]);
  }
  return null;
}

function extractLocation(text) {
  const match = text.match(/([A-Z]{4})/);
  return match ? match[1] : 'UNKNOWN';
}

function extractCoordinates(text) {
  const match = text.match(/(\d{2})(\d{2})(\d{2})([NS])\s*(\d{3})(\d{2})(\d{2})([EW])/);
  if (match) {
    const lat = parseInt(match[1]) + parseInt(match[2])/60 + parseInt(match[3])/3600;
    const lng = parseInt(match[5]) + parseInt(match[6])/60 + parseInt(match[7])/3600;
    return {
      latitude: match[4] === 'S' ? -lat : lat,
      longitude: match[8] === 'W' ? -lng : lng
    };
  }
  return null;
}

function extractAltitude(text) {
  const match = text.match(/(\d+)\s*FT/i);
  return match ? parseInt(match[1]) : null;
}

function generateBasicRecommendations(text) {
  const recommendations = [];
  const upperText = text.toUpperCase();
  
  if (upperText.includes('CLOSED') || upperText.includes('CLSD')) {
    recommendations.push('Plan alternate routing');
  }
  if (upperText.includes('CONSTRUCTION')) {
    recommendations.push('Expect delays and plan extra taxi time');
  }
  if (upperText.includes('NAVAID')) {
    recommendations.push('Verify backup navigation aids are available');
  }
  
  return recommendations;
}

module.exports = {
  parseNotam,
  summarize,
  getNotams,
  parseNotams,
  getRouteCriticalNotams
};