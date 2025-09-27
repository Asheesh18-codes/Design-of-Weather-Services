// METAR Decoder Utility
// Converts METAR weather reports into structured JSON format

const decode = (metarString) => {
  if (!metarString || typeof metarString !== 'string') {
    throw new Error('Valid METAR string is required');
  }

  const parts = metarString.trim().split(/\s+/);
  const decoded = {
    raw: metarString,
    station: '',
    observationTime: '',
    wind: {
      direction: null,
      speed: null,
      gust: null,
      variable: false,
      unit: 'KT'
    },
    visibility: {
      distance: null,
      unit: 'SM'
    },
    weather: [],
    clouds: [],
    temperature: null,
    dewpoint: null,
    pressure: {
      altimeter: null,
      unit: 'inHg'
    },
    remarks: ''
  };

  let index = 0;

  try {
    // Station identifier (ICAO code)
    if (parts[index] && /^[A-Z]{4}$/.test(parts[index])) {
      decoded.station = parts[index];
      index++;
    }

    // Date/Time group (e.g., 121851Z)
    if (parts[index] && /^\d{6}Z$/.test(parts[index])) {
      decoded.observationTime = parseDateTime(parts[index]);
      index++;
    }

    // Wind information (e.g., 24016G24KT, VRB05KT)
    if (parts[index] && /^(\d{3}|VRB)\d{2,3}(G\d{2,3})?KT$/.test(parts[index])) {
      decoded.wind = parseWind(parts[index]);
      index++;
    }

    // Variable wind direction (e.g., 240V300)
    if (parts[index] && /^\d{3}V\d{3}$/.test(parts[index])) {
      const [from, to] = parts[index].split('V');
      decoded.wind.variableFrom = parseInt(from);
      decoded.wind.variableTo = parseInt(to);
      decoded.wind.variable = true;
      index++;
    }

    // Visibility (e.g., 10SM, 1/2SM, M1/4SM)
    if (parts[index] && /^(\d+\/?\d*|M?\d+\/\d+)SM$/.test(parts[index])) {
      decoded.visibility = parseVisibility(parts[index]);
      index++;
    }

    // Weather phenomena (e.g., -RA, +TSRA, VCSH)
    while (index < parts.length && /^[+-]?[A-Z]{2,6}$/.test(parts[index])) {
      decoded.weather.push(parseWeatherPhenomena(parts[index]));
      index++;
    }

    // Cloud information (e.g., SCT015, BKN025, OVC010)
    while (index < parts.length && /^(SKC|CLR|FEW|SCT|BKN|OVC)\d{3}(CB|TCU)?$/.test(parts[index])) {
      decoded.clouds.push(parseCloudLayer(parts[index]));
      index++;
    }

    // Temperature and dewpoint (e.g., 22/13, M05/M10)
    if (parts[index] && /^M?\d{2}\/M?\d{2}$/.test(parts[index])) {
      const temps = parseTemperature(parts[index]);
      decoded.temperature = temps.temperature;
      decoded.dewpoint = temps.dewpoint;
      index++;
    }

    // Pressure/altimeter (e.g., A3000, Q1013)
    if (parts[index] && /^[AQ]\d{4}$/.test(parts[index])) {
      decoded.pressure = parsePressure(parts[index]);
      index++;
    }

    // Remarks (everything after RMK)
    const rmkIndex = parts.findIndex(part => part === 'RMK');
    if (rmkIndex !== -1) {
      decoded.remarks = parts.slice(rmkIndex + 1).join(' ');
    }

  } catch (error) {
    console.error('METAR parsing error:', error);
    decoded.parseError = error.message;
  }

  return decoded;
};

// Convert to human-readable format
const toHumanReadable = (decoded) => {
  const readable = {
    station: decoded.station,
    time: decoded.observationTime,
    conditions: []
  };

  // Wind information
  if (decoded.wind.speed !== null) {
    let windText = `Wind ${decoded.wind.direction === 'VRB' ? 'variable' : decoded.wind.direction + '°'} `;
    windText += `at ${decoded.wind.speed} knots`;
    if (decoded.wind.gust) {
      windText += `, gusting to ${decoded.wind.gust} knots`;
    }
    readable.conditions.push(windText);
  }

  // Visibility
  if (decoded.visibility.distance !== null) {
    readable.conditions.push(`Visibility ${decoded.visibility.distance} miles`);
  }

  // Weather
  if (decoded.weather.length > 0) {
    const weatherText = decoded.weather.map(w => w.description).join(', ');
    readable.conditions.push(`Weather: ${weatherText}`);
  }

  // Clouds
  if (decoded.clouds.length > 0) {
    const cloudsText = decoded.clouds.map(cloud => 
      `${cloud.coverage} at ${cloud.altitude} feet${cloud.type ? ` (${cloud.type})` : ''}`
    ).join(', ');
    readable.conditions.push(`Clouds: ${cloudsText}`);
  } else {
    readable.conditions.push('Sky clear');
  }

  // Temperature
  if (decoded.temperature !== null) {
    readable.conditions.push(`Temperature ${decoded.temperature}°C`);
  }

  // Dewpoint
  if (decoded.dewpoint !== null) {
    readable.conditions.push(`Dewpoint ${decoded.dewpoint}°C`);
  }

  // Pressure
  if (decoded.pressure.altimeter !== null) {
    readable.conditions.push(`Altimeter ${decoded.pressure.altimeter} ${decoded.pressure.unit}`);
  }

  readable.summary = readable.conditions.join('; ');
  return readable;
};

// Helper functions
function parseDateTime(timeString) {
  const day = timeString.substring(0, 2);
  const hour = timeString.substring(2, 4);
  const minute = timeString.substring(4, 6);
  
  const now = new Date();
  const observationDate = new Date(now.getFullYear(), now.getMonth(), parseInt(day), parseInt(hour), parseInt(minute));
  
  return observationDate.toISOString();
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
  const vis = visString.replace('SM', '');
  
  if (vis.startsWith('M')) {
    // Less than (e.g., M1/4 = less than 1/4 mile)
    const fraction = vis.substring(1);
    return {
      distance: `less than ${fraction}`,
      unit: 'SM',
      meters: convertToMeters(fraction) 
    };
  } else if (vis.includes('/')) {
    // Fractional (e.g., 1/2, 3/4)
    return {
      distance: vis,
      unit: 'SM',
      meters: convertToMeters(vis)
    };
  } else {
    // Whole number
    return {
      distance: parseInt(vis),
      unit: 'SM',
      meters: parseInt(vis) * 1609.34
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

function parseTemperature(tempString) {
  const [tempStr, dewStr] = tempString.split('/');
  
  const parseTemp = (str) => {
    if (str.startsWith('M')) {
      return -parseInt(str.substring(1));
    }
    return parseInt(str);
  };

  return {
    temperature: parseTemp(tempStr),
    dewpoint: parseTemp(dewStr)
  };
}

function parsePressure(pressureString) {
  const unit = pressureString.charAt(0);
  const value = pressureString.substring(1);

  if (unit === 'A') {
    // Altimeter in inches of mercury
    return {
      altimeter: parseFloat(value.substring(0, 2) + '.' + value.substring(2)),
      unit: 'inHg'
    };
  } else if (unit === 'Q') {
    // QNH in hectopascals
    return {
      altimeter: parseInt(value),
      unit: 'hPa'
    };
  }

  return {
    altimeter: null,
    unit: 'unknown'
  };
}

function convertToMeters(distance) {
  if (typeof distance === 'string' && distance.includes('/')) {
    const [num, den] = distance.split('/');
    return (parseInt(num) / parseInt(den)) * 1609.34;
  } else if (typeof distance === 'number') {
    return distance * 1609.34;
  }
  return null;
}

module.exports = {
  decode,
  toHumanReadable
};