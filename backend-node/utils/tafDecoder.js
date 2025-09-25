// TAF Decoder Utility
// Converts Terminal Aerodrome Forecast (TAF) reports into structured JSON format

const decode = (tafString) => {
  if (!tafString || typeof tafString !== 'string') {
    throw new Error('Valid TAF string is required');
  }

  const parts = tafString.trim().split(/\s+/);
  const decoded = {
    raw: tafString,
    type: 'TAF',
    station: '',
    issueTime: '',
    validPeriod: {
      from: '',
      to: ''
    },
    periods: [],
    parseErrors: []
  };

  let index = 0;

  try {
    // TAF indicator
    if (parts[index] === 'TAF') {
      index++;
    }

    // Station identifier (ICAO code)
    if (parts[index] && /^[A-Z]{4}$/.test(parts[index])) {
      decoded.station = parts[index];
      index++;
    }

    // Issue time (e.g., 121720Z)
    if (parts[index] && /^\d{6}Z$/.test(parts[index])) {
      decoded.issueTime = parseDateTime(parts[index]);
      index++;
    }

    // Valid period (e.g., 1218/1324)
    if (parts[index] && /^\d{4}\/\d{4}$/.test(parts[index])) {
      decoded.validPeriod = parseValidPeriod(parts[index], decoded.issueTime);
      index++;
    }

    // Parse forecast periods
    let currentPeriod = null;
    
    while (index < parts.length) {
      const part = parts[index];

      // Check for period indicators (FM, BECMG, TEMPO)
      if (part.startsWith('FM') && /^FM\d{6}$/.test(part)) {
        if (currentPeriod) decoded.periods.push(currentPeriod);
        currentPeriod = createNewPeriod('FROM', parseFromTime(part));
        index++;
      } else if (part.startsWith('BECMG')) {
        if (currentPeriod) decoded.periods.push(currentPeriod);
        currentPeriod = createNewPeriod('BECOMING', parseChangeTime(part, parts[index + 1]));
        index += part === 'BECMG' ? 2 : 1; // Skip time period if separate
      } else if (part.startsWith('TEMPO')) {
        if (currentPeriod) decoded.periods.push(currentPeriod);
        currentPeriod = createNewPeriod('TEMPORARY', parseChangeTime(part, parts[index + 1]));
        index += part === 'TEMPO' ? 2 : 1;
      } else if (part === 'PROB30' || part === 'PROB40') {
        // Probability indicators
        if (currentPeriod) {
          currentPeriod.probability = parseInt(part.replace('PROB', ''));
        }
        index++;
      } else {
        // If no period has been started, create initial period
        if (!currentPeriod) {
          currentPeriod = createNewPeriod('BASE', decoded.validPeriod);
        }

        // Parse weather elements
        if (parseWeatherElement(part, currentPeriod)) {
          // Successfully parsed
        } else {
          // Unknown element
          if (!currentPeriod.unknown) currentPeriod.unknown = [];
          currentPeriod.unknown.push(part);
        }
        
        index++;
      }
    }

    // Add the last period
    if (currentPeriod) {
      decoded.periods.push(currentPeriod);
    }

    // If no periods were found, create a base period with all elements
    if (decoded.periods.length === 0) {
      const basePeriod = createNewPeriod('BASE', decoded.validPeriod);
      const elements = parts.slice(parts.findIndex(p => /^\d{4}\/\d{4}$/.test(p)) + 1);
      
      for (const element of elements) {
        parseWeatherElement(element, basePeriod);
      }
      
      decoded.periods.push(basePeriod);
    }

  } catch (error) {
    decoded.parseErrors.push(error.message);
    console.error('TAF parsing error:', error);
  }

  return decoded;
};

// Convert to human-readable format
const toHumanReadable = (decoded) => {
  const readable = {
    station: decoded.station,
    issued: decoded.issueTime,
    validFrom: decoded.validPeriod.from,
    validTo: decoded.validPeriod.to,
    forecast: []
  };

  for (const period of decoded.periods) {
    const periodText = {
      type: period.type,
      time: period.validFrom && period.validTo 
        ? `${formatTime(period.validFrom)} to ${formatTime(period.validTo)}`
        : period.time || 'Base forecast',
      conditions: []
    };

    // Wind
    if (period.wind && period.wind.speed !== null) {
      let windText = `Wind ${period.wind.direction === 'VRB' ? 'variable' : period.wind.direction + '°'} `;
      windText += `at ${period.wind.speed} knots`;
      if (period.wind.gust) {
        windText += `, gusting to ${period.wind.gust} knots`;
      }
      periodText.conditions.push(windText);
    }

    // Visibility
    if (period.visibility && period.visibility.distance !== null) {
      periodText.conditions.push(`Visibility ${period.visibility.distance} miles`);
    }

    // Weather
    if (period.weather && period.weather.length > 0) {
      const weatherText = period.weather.map(w => w.description).join(', ');
      periodText.conditions.push(`Weather: ${weatherText}`);
    }

    // Clouds
    if (period.clouds && period.clouds.length > 0) {
      const cloudsText = period.clouds.map(cloud => 
        `${cloud.coverage} at ${cloud.altitude} feet${cloud.type ? ` (${cloud.type})` : ''}`
      ).join(', ');
      periodText.conditions.push(`Clouds: ${cloudsText}`);
    }

    // Wind shear
    if (period.windShear) {
      periodText.conditions.push(`Wind shear: ${period.windShear}`);
    }

    // Probability
    if (period.probability) {
      periodText.conditions.unshift(`${period.probability}% chance:`);
    }

    periodText.summary = periodText.conditions.join('; ');
    readable.forecast.push(periodText);
  }

  return readable;
};

// Helper functions
function createNewPeriod(type, timeInfo) {
  return {
    type,
    validFrom: timeInfo.from || timeInfo.validFrom || null,
    validTo: timeInfo.to || timeInfo.validTo || null,
    time: timeInfo.time || null,
    wind: null,
    visibility: null,
    weather: [],
    clouds: [],
    windShear: null,
    probability: null
  };
}

function parseDateTime(timeString) {
  const day = timeString.substring(0, 2);
  const hour = timeString.substring(2, 4);
  const minute = timeString.substring(4, 6);
  
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), parseInt(day), parseInt(hour), parseInt(minute));
  
  return date.toISOString();
}

function parseValidPeriod(periodString) {
  const [fromStr, toStr] = periodString.split('/');
  
  const parseTime = (timeStr) => {
    const day = parseInt(timeStr.substring(0, 2));
    const hour = parseInt(timeStr.substring(2, 4));
    
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), day, hour, 0);
    
    return date.toISOString();
  };

  return {
    from: parseTime(fromStr),
    to: parseTime(toStr)
  };
}

function parseFromTime(fmString) {
  // FM121800 format
  const timeStr = fmString.substring(2); // Remove FM
  const day = timeStr.substring(0, 2);
  const hour = timeStr.substring(2, 4);
  const minute = timeStr.substring(4, 6);
  
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), parseInt(day), parseInt(hour), parseInt(minute));
  
  return {
    from: date.toISOString(),
    time: `From ${formatTime(date.toISOString())}`
  };
}

function parseChangeTime(changeType, timeString) {
  // Handle BECMG 1820/1822 or TEMPO 1215/1218 format
  if (timeString && timeString.includes('/')) {
    const [fromStr, toStr] = timeString.split('/');
    
    const parseTime = (timeStr) => {
      const day = parseInt(timeStr.substring(0, 2));
      const hour = parseInt(timeStr.substring(2, 4));
      
      const now = new Date();
      const date = new Date(now.getFullYear(), now.getMonth(), day, hour, 0);
      
      return date.toISOString();
    };

    return {
      from: parseTime(fromStr),
      to: parseTime(toStr),
      time: `${changeType} ${formatTime(parseTime(fromStr))} to ${formatTime(parseTime(toStr))}`
    };
  }

  return {
    time: changeType
  };
}

function parseWeatherElement(element, period) {
  // Wind (e.g., 24015G25KT)
  if (/^(\d{3}|VRB)\d{2,3}(G\d{2,3})?KT$/.test(element)) {
    period.wind = parseWind(element);
    return true;
  }

  // Visibility (e.g., 6SM, P6SM)
  if (/^P?\d+\/?\d*SM$/.test(element) || /^M?\d+\/\d+SM$/.test(element)) {
    period.visibility = parseVisibility(element);
    return true;
  }

  // Weather phenomena (e.g., -RA, +TSRA, VCSH)
  if (/^[+-]?[A-Z]{2,6}$/.test(element) && !['SKC', 'CLR', 'FEW', 'SCT', 'BKN', 'OVC'].some(cloud => element.startsWith(cloud))) {
    period.weather.push(parseWeatherPhenomena(element));
    return true;
  }

  // Cloud layers (e.g., SCT015, BKN025, OVC010)
  if (/^(SKC|CLR|FEW|SCT|BKN|OVC)\d{3}(CB|TCU)?$/.test(element)) {
    period.clouds.push(parseCloudLayer(element));
    return true;
  }

  // Wind shear (e.g., WS010/24050KT)
  if (element.startsWith('WS')) {
    period.windShear = parseWindShear(element);
    return true;
  }

  // Altimeter (usually not in TAF but sometimes present)
  if (/^[AQ]\d{4}$/.test(element)) {
    period.altimeter = element;
    return true;
  }

  return false;
}

function parseWind(windString) {
  const match = windString.match(/^(VRB|\d{3})(\d{2,3})(G(\d{2,3}))?KT$/);
  
  return {
    direction: match[1] === 'VRB' ? 'VRB' : parseInt(match[1]),
    speed: parseInt(match[2]),
    gust: match[4] ? parseInt(match[4]) : null,
    variable: match[1] === 'VRB',
    unit: 'KT'
  };
}

function parseVisibility(visString) {
  let vis = visString.replace('SM', '');
  
  if (vis.startsWith('P')) {
    // Greater than (e.g., P6SM = greater than 6 miles)
    return {
      distance: `greater than ${vis.substring(1)}`,
      unit: 'SM'
    };
  } else if (vis.startsWith('M')) {
    // Less than (e.g., M1/4 = less than 1/4 mile)
    const fraction = vis.substring(1);
    return {
      distance: `less than ${fraction}`,
      unit: 'SM'
    };
  } else if (vis.includes('/')) {
    // Fractional (e.g., 1/2, 3/4)
    return {
      distance: vis,
      unit: 'SM'
    };
  } else {
    // Whole number
    return {
      distance: parseInt(vis),
      unit: 'SM'
    };
  }
}

function parseWeatherPhenomena(wxString) {
  const intensity = wxString.charAt(0) === '+' ? 'heavy' : 
                   wxString.charAt(0) === '-' ? 'light' : 'moderate';
  
  const phenomena = wxString.replace(/^[+-]/, '');
  
  const descriptions = {
    'RA': 'rain',
    'SN': 'snow',
    'TS': 'thunderstorm',
    'DZ': 'drizzle',
    'FG': 'fog',
    'BR': 'mist',
    'HZ': 'haze',
    'FU': 'smoke',
    'VA': 'volcanic ash',
    'DU': 'dust',
    'SA': 'sand',
    'IC': 'ice crystals',
    'PE': 'ice pellets',
    'GR': 'hail',
    'GS': 'small hail',
    'UP': 'unknown precipitation',
    'TSRA': 'thunderstorm with rain',
    'TSGR': 'thunderstorm with hail',
    'FZRA': 'freezing rain',
    'FZDZ': 'freezing drizzle',
    'SHSN': 'snow showers',
    'SHRA': 'rain showers',
    'VCSH': 'showers in vicinity',
    'VCFG': 'fog in vicinity'
  };

  return {
    raw: wxString,
    intensity,
    phenomena,
    description: `${intensity} ${descriptions[phenomena] || phenomena.toLowerCase()}`
  };
}

function parseCloudLayer(cloudString) {
  const coverage = cloudString.substring(0, 3);
  const altitude = parseInt(cloudString.substring(3, 6)) * 100;
  const type = cloudString.length > 6 ? cloudString.substring(6) : null;

  const coverageNames = {
    'SKC': 'sky clear',
    'CLR': 'clear',
    'FEW': 'few',
    'SCT': 'scattered',
    'BKN': 'broken',
    'OVC': 'overcast'
  };

  const typeNames = {
    'CB': 'cumulonimbus',
    'TCU': 'towering cumulus'
  };

  return {
    coverage: coverageNames[coverage] || coverage,
    altitude,
    type: type ? typeNames[type] : null,
    raw: cloudString
  };
}

function parseWindShear(wsString) {
  // WS010/24050KT format
  const match = wsString.match(/^WS(\d{3})\/(\d{3})(\d{2,3})(G\d{2,3})?KT$/);
  
  if (match) {
    return {
      altitude: parseInt(match[1]) * 100,
      windDirection: parseInt(match[2]),
      windSpeed: parseInt(match[3]),
      windGust: match[4] ? parseInt(match[4].substring(1)) : null
    };
  }
  
  return wsString;
}

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toUTCString().substring(17, 22) + 'Z';
}

module.exports = {
  decode,
  toHumanReadable
};