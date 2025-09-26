// Aviation data parsers for METAR, TAF, NOTAM, PIREP, SIGMET
// Returns comprehensive human-readable summaries for pilots

export function parseMetar(metar) {
  if (!metar) return null;
  
  try {
    // Extract station identifier
    const stationMatch = metar.match(/(?:METAR\s+)?([A-Z]{4})\s+/);
    const station = stationMatch ? stationMatch[1] : "Unknown";
    
    // Extract observation time
    const timeMatch = metar.match(/(\d{6}Z)/);
    const obsTime = timeMatch ? timeMatch[1] : "";
    
    // Extract wind information
    let windInfo = "Calm";
    const windMatch = metar.match(/(\d{3})(\d{2,3})(?:G(\d{2,3}))?KT/);
    if (windMatch) {
      const direction = windMatch[1];
      const speed = windMatch[2];
      const gusts = windMatch[3];
      windInfo = `${direction}° at ${speed} knots${gusts ? ` gusting to ${gusts} knots` : ""}`;
    }
    
    // Extract visibility
    let visibility = "Unknown";
    const visMatch = metar.match(/(\d{1,2})SM|(\d{4})|P6SM|M1\/4SM/);
    if (visMatch) {
      if (visMatch[1]) visibility = `${visMatch[1]} statute miles`;
      else if (visMatch[2]) visibility = `${visMatch[2]} meters`;
      else if (metar.includes("P6SM")) visibility = "Greater than 6 statute miles";
      else if (metar.includes("M1/4SM")) visibility = "Less than 1/4 statute mile";
    }
    
    // Extract weather phenomena
    let weather = [];
    const weatherPatterns = [
      { pattern: /-?RA/, description: "Rain" },
      { pattern: /-?SN/, description: "Snow" },
      { pattern: /-?DZ/, description: "Drizzle" },
      { pattern: /FG/, description: "Fog" },
      { pattern: /BR/, description: "Mist" },
      { pattern: /TS/, description: "Thunderstorm" },
      { pattern: /SH/, description: "Showers" }
    ];
    
    weatherPatterns.forEach(({ pattern, description }) => {
      const match = metar.match(pattern);
      if (match) {
        const intensity = match[0].startsWith('-') ? 'Light ' : 
                         match[0].startsWith('+') ? 'Heavy ' : '';
        weather.push(intensity + description);
      }
    });
    
    // Extract cloud information
    let clouds = [];
    const cloudMatches = metar.match(/(CLR|SKC|FEW|SCT|BKN|OVC)(\d{3})?/g);
    if (cloudMatches) {
      cloudMatches.forEach(cloud => {
        const cloudMatch = cloud.match(/(CLR|SKC|FEW|SCT|BKN|OVC)(\d{3})?/);
        if (cloudMatch) {
          const coverage = {
            'CLR': 'Clear',
            'SKC': 'Sky Clear',
            'FEW': 'Few',
            'SCT': 'Scattered',
            'BKN': 'Broken',
            'OVC': 'Overcast'
          }[cloudMatch[1]] || cloudMatch[1];
          
          const altitude = cloudMatch[2] ? ` at ${parseInt(cloudMatch[2]) * 100} feet` : '';
          clouds.push(coverage + altitude);
        }
      });
    }
    
    // Extract temperature and dewpoint
    let temperature = "Unknown", dewpoint = "Unknown";
    const tempMatch = metar.match(/\s(M?\d{2})\/(M?\d{2})\s/);
    if (tempMatch) {
      temperature = tempMatch[1].replace('M', '-') + "°C";
      dewpoint = tempMatch[2].replace('M', '-') + "°C";
    }
    
    // Extract altimeter setting
    let altimeter = "Unknown";
    const altMatch = metar.match(/A(\d{4})|Q(\d{4})/);
    if (altMatch) {
      if (altMatch[1]) {
        const inHg = (parseInt(altMatch[1]) / 100).toFixed(2);
        altimeter = `${inHg} inches Hg`;
      } else if (altMatch[2]) {
        altimeter = `${altMatch[2]} millibars`;
      }
    }
    
    // Determine flight conditions
    const vis = parseFloat(metar.match(/(\d{1,2})SM/)?.[1]) || 10;
    const hasBrokenOvercast = metar.match(/(BKN|OVC)(\d{3})/);
    const ceilingHeight = hasBrokenOvercast ? parseInt(hasBrokenOvercast[2]) * 100 : 10000;
    
    let flightRules = "VFR";
    if (vis < 3 || ceilingHeight < 1000) flightRules = "IFR";
    else if (vis < 5 || ceilingHeight < 3000) flightRules = "MVFR";
    
    return {
      raw: metar,
      parsed: {
        station,
        observationTime: obsTime,
        wind: windInfo,
        visibility,
        weather: weather.length > 0 ? weather.join(", ") : "No significant weather",
        clouds: clouds.length > 0 ? clouds.join(", ") : "No significant clouds",
        temperature,
        dewpoint,
        altimeter,
        flightRules
      },
      summary: `${station}: ${flightRules} conditions, ${temperature}/${dewpoint}, Wind: ${windInfo}, Visibility: ${visibility}, ${clouds.join(", ") || "Clear skies"}`
    };
  } catch (error) {
    return {
      raw: metar,
      summary: "Unable to parse METAR - " + error.message,
      parsed: { error: "Parsing failed" }
    };
  }
}

export function parseTaf(taf) {
  if (!taf) return null;
  
  try {
    // Extract station identifier
    const stationMatch = taf.match(/TAF\s+([A-Z]{4})\s+/);
    const station = stationMatch ? stationMatch[1] : "Unknown";
    
    // Extract issuance time
    const timeMatch = taf.match(/(\d{6}Z)/);
    const issueTime = timeMatch ? timeMatch[1] : "";
    
    // Extract valid period
    const validMatch = taf.match(/(\d{4})\/(\d{4})/);
    const validPeriod = validMatch ? `${validMatch[1]} to ${validMatch[2]}` : "";
    
    // Parse forecast periods (including FM periods)
    const periods = [];
    const lines = taf.split(/\n|\r/).filter(Boolean);
    
    lines.forEach(line => {
      // Skip TAF header line
      if (line.includes('TAF')) return;
      
      // Check for change indicators
      let changeType = "Base Forecast";
      if (line.includes('FM')) changeType = "Change From";
      if (line.includes('TEMPO')) changeType = "Temporary";
      if (line.includes('BECMG')) changeType = "Becoming";
      
      // Extract wind for this period
      let windInfo = "Unknown";
      const windMatch = line.match(/(\d{3})(\d{2,3})(?:G(\d{2,3}))?KT/);
      if (windMatch) {
        const direction = windMatch[1];
        const speed = windMatch[2];
        const gusts = windMatch[3];
        windInfo = `${direction}° at ${speed} knots${gusts ? ` gusting to ${gusts} knots` : ""}`;
      }
      
      // Extract visibility for this period
      let visibility = "Unknown";
      const visMatch = line.match(/P6SM|(\d{1,2})SM|(\d{4})/);
      if (visMatch) {
        if (line.includes("P6SM")) visibility = "Greater than 6 statute miles";
        else if (visMatch[1]) visibility = `${visMatch[1]} statute miles`;
        else if (visMatch[2]) visibility = `${visMatch[2]} meters`;
      }
      
      // Extract clouds for this period
      let clouds = [];
      const cloudMatches = line.match(/(FEW|SCT|BKN|OVC)(\d{3})/g);
      if (cloudMatches) {
        cloudMatches.forEach(cloud => {
          const cloudMatch = cloud.match(/(FEW|SCT|BKN|OVC)(\d{3})/);
          if (cloudMatch) {
            const coverage = {
              'FEW': 'Few',
              'SCT': 'Scattered', 
              'BKN': 'Broken',
              'OVC': 'Overcast'
            }[cloudMatch[1]];
            const altitude = parseInt(cloudMatch[2]) * 100;
            clouds.push(`${coverage} at ${altitude} feet`);
          }
        });
      }
      
      // Extract weather phenomena
      let weather = [];
      const weatherPatterns = [
        { pattern: /-?RA/, description: "Rain" },
        { pattern: /-?SN/, description: "Snow" },
        { pattern: /TS/, description: "Thunderstorms" },
        { pattern: /SH/, description: "Showers" },
        { pattern: /FG/, description: "Fog" }
      ];
      
      weatherPatterns.forEach(({ pattern, description }) => {
        const match = line.match(pattern);
        if (match) {
          const intensity = match[0].startsWith('-') ? 'Light ' : 
                           match[0].startsWith('+') ? 'Heavy ' : '';
          weather.push(intensity + description);
        }
      });
      
      if (windInfo !== "Unknown" || visibility !== "Unknown" || clouds.length > 0) {
        periods.push({
          type: changeType,
          wind: windInfo,
          visibility,
          weather: weather.length > 0 ? weather.join(", ") : "No significant weather",
          clouds: clouds.length > 0 ? clouds.join(", ") : "No significant clouds"
        });
      }
    });
    
    return {
      raw: taf,
      parsed: {
        station,
        issueTime,
        validPeriod,
        periods
      },
      summary: `${station} TAF: Valid ${validPeriod}. ${periods.length} forecast periods with varying conditions from ${periods[0]?.wind || 'unknown wind'} and ${periods[0]?.visibility || 'unknown visibility'}.`
    };
    
  } catch (error) {
    return {
      raw: taf,
      summary: "Unable to parse TAF - " + error.message,
      parsed: { error: "Parsing failed" }
    };
  }
}

export function parseNotam(notam) {
  if (!notam) return null;
  
  try {
    // Extract NOTAM ID
    const idMatch = notam.match(/([A-Z]\d{4}\/\d{2})/);
    const notamId = idMatch ? idMatch[1] : "Unknown";
    
    // Extract airport code
    const airportMatch = notam.match(/([A-Z]{4})/);
    const airport = airportMatch ? airportMatch[1] : "Unknown";
    
    // Determine NOTAM category and extract specific details
    let category = "General";
    let details = "";
    let severity = "Medium";
    
    if (notam.includes("RWY") || notam.includes("RUNWAY")) {
      category = "Runway";
      const runwayMatch = notam.match(/RWY\s+(\d{2}[LRC]?\/\d{2}[LRC]?|\d{2}[LRC]?)/);
      if (runwayMatch) {
        details = `Runway ${runwayMatch[1]}`;
        if (notam.includes("CLSD") || notam.includes("CLOSED")) {
          details += " - CLOSED";
          severity = "High";
        } else if (notam.includes("CONST") || notam.includes("CONSTRUCTION")) {
          details += " - Construction work";
          severity = "High";
        }
      }
    } else if (notam.includes("TWY") || notam.includes("TAXIWAY")) {
      category = "Taxiway";
      const taxiwayMatch = notam.match(/TWY\s+([A-Z]\d?)/);
      if (taxiwayMatch) {
        details = `Taxiway ${taxiwayMatch[1]}`;
        if (notam.includes("CLSD") || notam.includes("CLOSED")) {
          details += " - CLOSED";
          severity = "Medium";
        }
      }
    } else if (notam.includes("ILS") || notam.includes("NAV")) {
      category = "Navigation";
      if (notam.includes("ILS")) {
        const ilsMatch = notam.match(/ILS\s+RWY\s+(\d{2}[LRC]?)/);
        if (ilsMatch) {
          details = `ILS Runway ${ilsMatch[1]}`;
        } else {
          details = "ILS System";
        }
        if (notam.includes("U/S") || notam.includes("UNSERVICEABLE")) {
          details += " - OUT OF SERVICE";
          severity = "High";
        }
      }
    } else if (notam.includes("APRON") || notam.includes("RAMP")) {
      category = "Ground Operations";
      details = "Apron/Ramp area";
    } else if (notam.includes("LIGHTING") || notam.includes("LGT")) {
      category = "Lighting";
      details = "Airport lighting system";
    }
    
    // Extract effective dates
    let effectiveDate = "";
    let expiryDate = "";
    const dateMatch = notam.match(/(\d{10})-(\d{10})/);
    if (dateMatch) {
      const startDate = dateMatch[1];
      const endDate = dateMatch[2];
      
      // Parse YYMMDDTTTT format
      const startYear = "20" + startDate.substr(0, 2);
      const startMonth = startDate.substr(2, 2);
      const startDay = startDate.substr(4, 2);
      const startTime = startDate.substr(6, 4);
      
      const endYear = "20" + endDate.substr(0, 2);
      const endMonth = endDate.substr(2, 2);
      const endDay = endDate.substr(4, 2);
      const endTime = endDate.substr(6, 4);
      
      effectiveDate = `${startMonth}/${startDay}/${startYear} ${startTime.substr(0,2)}:${startTime.substr(2,2)}Z`;
      expiryDate = `${endMonth}/${endDay}/${endYear} ${endTime.substr(0,2)}:${endTime.substr(2,2)}Z`;
    }
    
    // Extract additional context
    let additionalInfo = "";
    if (notam.includes("DUE") || notam.includes("CONST")) {
      additionalInfo = "Due to construction/maintenance";
    } else if (notam.includes("OBST")) {
      additionalInfo = "Due to obstruction";
    } else if (notam.includes("WX") || notam.includes("WEATHER")) {
      additionalInfo = "Due to weather conditions";
    }
    
    return {
      raw: notam,
      parsed: {
        id: notamId,
        airport,
        category,
        details,
        severity,
        effectiveDate,
        expiryDate,
        additionalInfo
      },
      summary: `${airport} NOTAM ${notamId}: ${category} - ${details}. ${severity} impact. Effective: ${effectiveDate} to ${expiryDate}. ${additionalInfo}`
    };
    
  } catch (error) {
    return {
      raw: notam,
      summary: "Unable to parse NOTAM - " + error.message,
      parsed: { error: "Parsing failed" }
    };
  }
}


export function parsePirep(pirep) {
  if (!pirep) return null;
  // Example: UA /OV DCA270015 /TM 1920 /FL080 /TP B737 /TB MOD /IC NEG /SK BKN070-TOP090
  const match = pirep.match(/\/OV\s(\w+)\s\/TM\s(\d{4})\s\/FL(\d{3})\s\/TP\s(\w+)\s\/TB\s(\w+)\s\/IC\s(\w+)\s\/SK\s(.*)/);
  if (!match) return { raw: pirep, summary: "Unable to parse PIREP." };
  const [_, location, time, fl, aircraft, tb, ic, sky] = match;
  // Abbreviation maps
  const tbMap = { "NEG": "none", "LGT": "light", "MOD": "moderate", "SEV": "severe", "LGT-MOD": "light to moderate", "MOD-SEV": "moderate to severe", "EXTRM": "extreme", "CHOP": "choppy" };
  const icMap = { "NEG": "none", "LGT": "light", "MOD": "moderate", "SEV": "severe", "TR": "trace" };
  const skyMap = { "CLR": "clear", "BKN": "broken clouds", "OVC": "overcast", "SCT": "scattered clouds", "FEW": "few clouds", "SKC": "sky clear" };
  // Convert time (hhmm) to readable
  const timeStr = time ? `${time.slice(0,2)}:${time.slice(2,4)} UTC` : time;
  // Convert FL to feet
  const flFeet = fl ? `${parseInt(fl,10)*100} feet` : fl;
  // Expand sky (may be like BKN070-TOP090)
  let skyDesc = sky;
  if (sky) {
    skyDesc = sky.replace(/([A-Z]{3})(\d{3})?-?(TOP)?(\d{3})?/g, (m, cov, base, top, topAlt) => {
      let s = skyMap[cov] || cov;
      if (base) s += ` at ${parseInt(base,10)*100} feet`;
      if (top && topAlt) s += `, tops at ${parseInt(topAlt,10)*100} feet`;
      return s;
    });
  }
  // Compose English summary
  return {
    raw: pirep,
    summary: `Pilot report near ${location}. At ${timeStr}, a ${aircraft} reported ${tbMap[tb]||tb} turbulence and ${icMap[ic]||ic} icing at ${flFeet}. Sky condition: ${skyDesc}.`
  };
}


export function parseSigmet(sigmet) {
  if (!sigmet) return null;
  // Example: SIGMET NOVEMBER 2 VALID 261800/262200 KZNY- ...
  const match = sigmet.match(/SIGMET\s(\w+)\s(\d+)\sVALID\s(\d{6})\/(\d{6})\s(\w+)-\s(.*)/);
  if (!match) return { raw: sigmet, summary: "Unable to parse SIGMET." };
  const [_, name, num, from, to, fir, details] = match;
  // Expand details
  let detailsText = details;
  detailsText = detailsText.replace(/SEV\s*TURB/gi, "severe turbulence");
  detailsText = detailsText.replace(/SEV\s*ICE/gi, "severe icing");
  detailsText = detailsText.replace(/FCST/gi, "is forecast");
  detailsText = detailsText.replace(/BTN\s*FL(\d{3})\s*AND\s*FL(\d{3})/gi, (m, fl1, fl2) => `between ${parseInt(fl1,10)*100} and ${parseInt(fl2,10)*100} feet`);
  detailsText = detailsText.replace(/FL(\d{3})/gi, (m, fl) => `${parseInt(fl,10)*100} feet`);
  detailsText = detailsText.replace(/KZNY/gi, "the New York FIR");
  detailsText = detailsText.replace(/KZLA/gi, "the Los Angeles FIR");
  // Convert validity
  function parseTime(ts) {
    if (!ts || ts.length !== 6) return ts;
    const day = ts.slice(0,2), hour = ts.slice(2,4), min = ts.slice(4,6);
    return `${day}th, ${hour}:${min} UTC`;
  }
  const fromStr = parseTime(from);
  const toStr = parseTime(to);
  return {
    raw: sigmet,
    summary: `SIGMET ${name} #${num} is valid from ${fromStr} to ${toStr} in ${fir === 'KZNY' ? 'the New York FIR' : fir === 'KZLA' ? 'the Los Angeles FIR' : fir}. ${detailsText.charAt(0).toUpperCase() + detailsText.slice(1)}.`
  };
}
