
import React, { useState, useEffect } from "react";

// Sample airport data from seed-data.js
const sampleAirports = {
  'KJFK': {
    name: 'John F. Kennedy International Airport',
    metar: 'KJFK 251651Z 24016G24KT 10SM BKN250 22/13 A3000 RMK AO2 SLP157 T02220128',
    taf: 'TAF KJFK 251720Z 1818/1924 24015G25KT P6SM BKN200 FM182000 25012KT P6SM SCT250',
    notam: 'A1234/23 KJFK AD AP RWY 04L/22R CLSD DUE CONST 2309261200-2309262359'
  },
  'KSFO': {
    name: 'San Francisco International Airport',
    metar: 'KSFO 251651Z 28008KT 10SM FEW200 18/12 A3015 RMK AO2 SLP218 T01780122',
    taf: 'TAF KSFO 261740Z 2618/2724 30012KT P6SM SCT015 BKN120',
    notam: 'A5678/23 KSFO AD AP TWY A BTN TWY B AND TWY C CLSD 2309261800-2309270600'
  },
  'KORD': {
    name: 'Chicago O\'Hare International Airport',
    metar: 'KORD 251651Z 09012KT 8SM -RA BKN015 OVC030 15/13 A2995 RMK AO2 RAB25 SLP142',
    taf: 'TAF KORD 261740Z 2618/2724 22015KT P6SM SCT050 BKN120 FM270000 21012KT 6SM -RA BKN030 OVC080',
    notam: 'A9012/23 KORD AD AP ILS RWY 28L U/S 2309260800-2309271200'
  },
  'KDEN': {
    name: 'Denver International Airport',
    metar: 'KDEN 251651Z 25018G24KT 10SM SCT180 BKN240 18/M02 A3012 RMK AO2 SLP216',
    taf: 'TAF KDEN 261740Z 2618/2724 25018G24KT P6SM SCT180 BKN240',
    notam: 'A7890/23 KDEN AD AP RWY 16R/34L CLSD FOR MAINT 2309261000-2309261600'
  },
  'KLAX': {
    name: 'Los Angeles International Airport',
    metar: 'KLAX 251651Z 24008KT 10SM FEW015 SCT250 21/18 A2988 RMK AO2 SLP120',
    taf: 'TAF KLAX 261740Z 2618/2724 24008KT P6SM FEW015 SCT250',
    notam: 'A5555/23 KLAX AD AP TWY B CLSD BTN TWY A AND TWY C 2309261200-2309270600'
  }
};

export default function FlightForm({ onSubmit, onError, loading }) {
  // Departure
  const [origin, setOrigin] = useState("");
  const [depMetar, setDepMetar] = useState("");
  const [depTaf, setDepTaf] = useState("");
  const [depNotam, setDepNotam] = useState("");
  // Enroute
  const [sigmets, setSigmets] = useState("");
  const [pireps, setPireps] = useState("");
  // Arrival
  const [destination, setDestination] = useState("");
  const [arrMetar, setArrMetar] = useState("");
  const [arrTaf, setArrTaf] = useState("");
  const [arrNotam, setArrNotam] = useState("");

  // Auto-populate departure airport data when origin changes
  useEffect(() => {
    if (origin && origin.length === 4) {
      const airportData = sampleAirports[origin.toUpperCase()];
      if (airportData) {
        setDepMetar(airportData.metar);
        setDepTaf(airportData.taf);
        setDepNotam(airportData.notam);
      } else {
        // Clear fields if airport not found in sample data
        setDepMetar("");
        setDepTaf("");
        setDepNotam("");
      }
    }
  }, [origin]);

  // Auto-populate arrival airport data when destination changes
  useEffect(() => {
    if (destination && destination.length === 4) {
      const airportData = sampleAirports[destination.toUpperCase()];
      if (airportData) {
        setArrMetar(airportData.metar);
        setArrTaf(airportData.taf);
        setArrNotam(airportData.notam);
      } else {
        // Clear fields if airport not found in sample data
        setArrMetar("");
        setArrTaf("");
        setArrNotam("");
      }
    }
  }, [destination]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!origin || !destination) {
      onError && onError("Origin and destination ICAO codes are required.");
      return;
    }
    if (origin.length !== 4 || destination.length !== 4) {
      onError && onError("ICAO codes must be exactly 4 characters.");
      return;
    }
    const payload = {
      origin: {
        icao: origin.toUpperCase(),
        metar: depMetar || undefined,
        taf: depTaf || undefined,
        notams: depNotam || undefined,
      },
      enroute: {
        sigmets: sigmets || undefined,
        pireps: pireps || undefined,
      },
      destination: {
        icao: destination.toUpperCase(),
        metar: arrMetar || undefined,
        taf: arrTaf || undefined,
        notams: arrNotam || undefined,
      }
    };
    onSubmit(payload);
  };

  const generateLiveDemo = async () => {
    // Set demo airports with automatic data population
    setOrigin("KORD");
    setDestination("KSFO");
    setSigmets("SIGMET R2 VALID 261800/262200 KZNY- KORD severe turbulence");
    setPireps("UA /OV ORD270015 /TM 1920 /FL080 /TP B737 /TB MOD /IC NEG /SK BKN070-TOP090");
    
    // Wait a moment for useEffect to populate the weather data
    setTimeout(() => {
      // Get the airport data that would be populated by useEffect
      const kordData = sampleAirports['KORD'];
      const ksfoData = sampleAirports['KSFO'];
      
      // Create the payload with all the demo data
      const demoPayload = {
        origin: {
          icao: "KORD",
          metar: kordData.metar,
          taf: kordData.taf,
          notams: kordData.notam,
        },
        enroute: {
          sigmets: "SIGMET R2 VALID 261800/262200 KZNY- KORD severe turbulence",
          pireps: "UA /OV ORD270015 /TM 1920 /FL080 /TP B737 /TB MOD /IC NEG /SK BKN070-TOP090",
        },
        destination: {
          icao: "KSFO",
          metar: ksfoData.metar,
          taf: ksfoData.taf,
          notams: ksfoData.notam,
        }
      };
      
      // Automatically submit to generate the full briefing
      onSubmit(demoPayload);
    }, 100);
  };

  const clearForm = () => {
    setOrigin("");
    setDepMetar("");
    setDepTaf("");
    setDepNotam("");
    setSigmets("");
    setPireps("");
    setDestination("");
    setArrMetar("");
    setArrTaf("");
    setArrNotam("");
  };

  return (
    <div className="flight-form-container" style={{padding: '8px 0'}}>
      <h2 className="form-title" style={{fontSize: '20px', fontWeight: 700, color: 'var(--accent-600)', marginBottom: 18}}>Pilot Weather Briefing</h2>
      <form onSubmit={handleSubmit} className="flight-form">
        {/* Departure Section */}
        <div className="card" style={{marginBottom: '18px', background: '#f7fbfc'}}>
          <div style={{fontWeight:700, fontSize:'16px', color:'var(--accent-600)', marginBottom:'10px'}}>🛫 Departure</div>
          <div className="form-row">
            <label className="label">Origin ICAO *</label>
            <input 
              className={`input ${origin && sampleAirports[origin.toUpperCase()] ? 'input-success' : ''}`} 
              value={origin} 
              onChange={(e) => setOrigin(e.target.value.toUpperCase())} 
              placeholder="e.g. KORD" 
              maxLength={4} 
              required 
            />
            {origin && origin.length === 4 && sampleAirports[origin.toUpperCase()] && (
              <small style={{color: '#16a34a', fontWeight: 500}}>
                ✓ {sampleAirports[origin.toUpperCase()].name}
              </small>
            )}
            {origin && origin.length === 4 && !sampleAirports[origin.toUpperCase()] && (
              <small style={{color: '#ea580c', fontWeight: 500}}>
                ⚠ Airport not in demo database - please enter weather data manually
              </small>
            )}
          </div>
          <div className="form-row">
            <label className="label">METAR *</label>
            <textarea className="input textarea" value={depMetar} onChange={(e) => setDepMetar(e.target.value)} placeholder="Paste METAR report..." rows={2} required />
          </div>
          <div className="form-row">
            <label className="label">TAF *</label>
            <textarea className="input textarea" value={depTaf} onChange={(e) => setDepTaf(e.target.value)} placeholder="Paste TAF report..." rows={2} required />
          </div>
          <div className="form-row">
            <label className="label">NOTAMs *</label>
            <textarea className="input textarea" value={depNotam} onChange={(e) => setDepNotam(e.target.value)} placeholder="Runway closures, taxiway restrictions..." rows={2} required />
          </div>
          {/* Runway/Performance and Planned Departure Time removed */}
        </div>

        {/* Enroute Section */}
        <div className="card" style={{marginBottom: '18px', background: '#f7fbfc'}}>
          <div style={{fontWeight:700, fontSize:'16px', color:'var(--accent-600)', marginBottom:'10px'}}>✈️ Enroute Essentials</div>
          <div className="form-row">
            <label className="label">SIGMETs (optional)</label>
            <textarea className="input textarea" value={sigmets} onChange={(e) => setSigmets(e.target.value)} placeholder="Severe turbulence, icing, volcanic ash..." rows={2} />
          </div>
          <div className="form-row">
            <label className="label">PIREPs (optional)</label>
            <textarea className="input textarea" value={pireps} onChange={(e) => setPireps(e.target.value)} placeholder="Turbulence, icing, cloud tops/bases..." rows={2} />
          </div>
          {/* Enroute NOTAMs removed */}
        </div>

        {/* Arrival Section */}
        <div className="card" style={{marginBottom: '18px', background: '#f7fbfc'}}>
          <div style={{fontWeight:700, fontSize:'16px', color:'var(--accent-600)', marginBottom:'10px'}}>🛬 Arrival</div>
          <div className="form-row">
            <label className="label">Destination ICAO *</label>
            <input 
              className={`input ${destination && sampleAirports[destination.toUpperCase()] ? 'input-success' : ''}`} 
              value={destination} 
              onChange={(e) => setDestination(e.target.value.toUpperCase())} 
              placeholder="e.g. KSFO" 
              maxLength={4} 
              required 
            />
            {destination && destination.length === 4 && sampleAirports[destination.toUpperCase()] && (
              <small style={{color: '#16a34a', fontWeight: 500}}>
                ✓ {sampleAirports[destination.toUpperCase()].name}
              </small>
            )}
            {destination && destination.length === 4 && !sampleAirports[destination.toUpperCase()] && (
              <small style={{color: '#ea580c', fontWeight: 500}}>
                ⚠ Airport not in demo database - please enter weather data manually
              </small>
            )}
          </div>
          <div className="form-row">
            <label className="label">METAR *</label>
            <textarea className="input textarea" value={arrMetar} onChange={(e) => setArrMetar(e.target.value)} placeholder="Paste METAR report..." rows={2} required />
          </div>
          <div className="form-row">
            <label className="label">TAF *</label>
            <textarea className="input textarea" value={arrTaf} onChange={(e) => setArrTaf(e.target.value)} placeholder="Paste TAF report..." rows={2} required />
          </div>
          <div className="form-row">
            <label className="label">NOTAMs *</label>
            <textarea className="input textarea" value={arrNotam} onChange={(e) => setArrNotam(e.target.value)} placeholder="Runway availability, nav aid outages..." rows={2} required />
          </div>
        </div>

        <div className="form-actions" style={{display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '18px'}}>
          <button type="button" onClick={generateLiveDemo} className="btn btn-primary" disabled={loading} style={{width: '100%'}}>Live Demo - Generate Full Briefing</button>
          <button type="button" onClick={clearForm} className="btn btn-ghost" disabled={loading} style={{width: '100%'}}>Clear</button>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{width: '100%'}}>{loading ? "Generating Briefing..." : "Get Briefing"}</button>
        </div>
        <div className="form-help">
          <p>* Required fields</p>
          <p>Available airports in demo: <strong>KJFK, KSFO, KORD, KDEN, KLAX</strong></p>
          <p>Enter any 4-letter ICAO airport code. Weather data will auto-populate for available airports.</p>
        </div>
      </form>
    </div>
  );
}