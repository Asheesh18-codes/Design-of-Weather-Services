// Aviation data parsers for METAR, TAF, NOTAM, PIREP, SIGMET
// Returns human-readable summaries for pilots

export function parseMetar(metar) {
  if (!metar) return null;
  // Simple regex-based parse for demo
  const match = metar.match(/METAR\s+(\w{4})\s+(\d{6}Z)\s+(\d{3})(\d{2})KT\s+(\d+)SM\s+(.*)\s(\d{2})\/(\d{2})\sA(\d{4})/);
  if (!match) return { raw: metar, summary: "Unable to parse METAR." };
  return {
    raw: metar,
    summary: `Station: ${match[1]}, Time: ${match[2]}, Wind: ${match[3]}° at ${match[4]}kt, Visibility: ${match[5]}SM, Clouds: ${match[6]}, Temp/Dew: ${match[7]}/${match[8]}°C, Pressure: ${match[9]}`
  };
}

export function parseTaf(taf) {
  if (!taf) return null;
  // Simple parse: split lines, extract periods and conditions
  const lines = taf.split(/\n|\r/).filter(Boolean);
  return {
    raw: taf,
    summary: lines.map(line => line.replace(/TAF\s+|FM|\s+/g, " ")).join(" ")
  };
}

export function parseNotam(notam) {
  if (!notam) return null;
  // Example: !JFK 09/123 JFK RWY 04L/22R CLSD 2209261200-2209272359
  const match = notam.match(/!(\w{3,4})\s.*RWY\s(\d{2}[LRC]?\/\d{2}[LRC]?)\sCLSD\s(\d{10})-(\d{10})/);
  if (!match) return { raw: notam, summary: "Unable to parse NOTAM." };
  return {
    raw: notam,
    summary: `Location: ${match[1]}, Runway: ${match[2]} closed, Valid: ${match[3]} to ${match[4]}`
  };
}

export function parsePirep(pirep) {
  if (!pirep) return null;
  // Example: UA /OV DCA270015 /TM 1920 /FL080 /TP B737 /TB MOD /IC NEG /SK BKN070-TOP090
  const match = pirep.match(/\/OV\s(\w+)\s\/TM\s(\d{4})\s\/FL(\d{3})\s\/TP\s(\w+)\s\/TB\s(\w+)\s\/IC\s(\w+)\s\/SK\s(.*)/);
  if (!match) return { raw: pirep, summary: "Unable to parse PIREP." };
  return {
    raw: pirep,
    summary: `Location: ${match[1]}, Time: ${match[2]}, FL: ${match[3]}00ft, Aircraft: ${match[4]}, Turbulence: ${match[5]}, Icing: ${match[6]}, Sky: ${match[7]}`
  };
}

export function parseSigmet(sigmet) {
  if (!sigmet) return null;
  // Example: SIGMET NOVEMBER 2 VALID 261800/262200 KZNY- ...
  const match = sigmet.match(/SIGMET\s(\w+)\s(\d+)\sVALID\s(\d{6})\/(\d{6})\s(\w+)-\s(.*)/);
  if (!match) return { raw: sigmet, summary: "Unable to parse SIGMET." };
  return {
    raw: sigmet,
    summary: `Advisory: ${match[1]} #${match[2]}, Valid: ${match[3]}-${match[4]}, FIR: ${match[5]}, Details: ${match[6]}`
  };
}
