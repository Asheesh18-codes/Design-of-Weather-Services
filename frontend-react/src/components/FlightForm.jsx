import React, { useState, useEffect } from "react";
import { airportAPI, weatherAPI } from "../services/api";
  const fetchMetarTaf = async (icao, setMetar, setTaf, setLoading) => {
    if (!icao || icao.length !== 4) return;
    setLoading && setLoading(true);
    try {
      const [metarRes, tafRes] = await Promise.all([
        weatherAPI.getLatestMetar ? weatherAPI.getLatestMetar(icao) : weatherAPI.decodeMetar({ icao, metarString: undefined }),
        weatherAPI.getLatestTaf ? weatherAPI.getLatestTaf(icao) : weatherAPI.decodeTaf({ icao, tafString: undefined })
      ]);
      if (metarRes && (metarRes.metar || metarRes.raw)) setMetar(metarRes.metar || metarRes.raw);
      if (tafRes && (tafRes.taf || tafRes.raw)) setTaf(tafRes.taf || tafRes.raw);
    } catch (e) {
      onError && onError("Failed to fetch METAR/TAF for " + icao);
    }
    setLoading && setLoading(false);
  };

export default function FlightForm({ onSubmit, onError, loading, onWeatherChange }) {
  // Weather autofill loading states
  const [loadingDepWx, setLoadingDepWx] = useState(false);
  const [loadingArrWx, setLoadingArrWx] = useState(false);

  // Fetch METAR/TAF for a given ICAO and set state
  const fetchMetarTaf = async (icao, setMetar, setTaf, setLoading) => {
    if (!icao || icao.length !== 4) return;
    setLoading && setLoading(true);
    try {
      const [metarRes, tafRes] = await Promise.all([
        weatherAPI.getLatestMetar ? weatherAPI.getLatestMetar(icao) : weatherAPI.decodeMetar({ icao, metarString: undefined }),
        weatherAPI.getLatestTaf ? weatherAPI.getLatestTaf(icao) : weatherAPI.decodeTaf({ icao, tafString: undefined })
      ]);
      if (metarRes && (metarRes.metar || metarRes.raw)) setMetar(metarRes.metar || metarRes.raw);
      if (tafRes && (tafRes.taf || tafRes.raw)) setTaf(tafRes.taf || tafRes.raw);
    } catch (e) {
      onError && onError("Failed to fetch METAR/TAF for " + icao);
    }
    setLoading && setLoading(false);
  };
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

  // Dynamic weather update
  useEffect(() => {
    if (onWeatherChange) {
      onWeatherChange({
        depMetar, arrMetar, depTaf, arrTaf, depNotam, arrNotam, sigmets, pireps
      });
    }
  }, [depMetar, arrMetar, depTaf, arrTaf, depNotam, arrNotam, sigmets, pireps, onWeatherChange]);

  // Live ICAO lookup for airport names
  const [originInfo, setOriginInfo] = useState(null);
  const [originLookup, setOriginLookup] = useState("idle"); // idle|loading|ok|notfound|error
  const [destInfo, setDestInfo] = useState(null);
  const [destLookup, setDestLookup] = useState("idle");

  // ICAO lookup for airport names is retained, but automatic METAR/TAF fetching is disabled.
  useEffect(() => {
    if (!origin || origin.length !== 4) {
      setOriginInfo(null);
      setOriginLookup("idle");
      return;
    }
    setOriginLookup("loading");
    const t = setTimeout(async () => {
      try {
        const info = await airportAPI.getAirportInfo(origin.toUpperCase());
        if (info?.airport?.name) {
          setOriginInfo(info.airport);
          setOriginLookup("ok");
        } else {
          setOriginInfo(null);
          setOriginLookup("notfound");
        }
      } catch (e) {
        setOriginInfo(null);
        setOriginLookup("error");
      }
    }, 300);
    return () => clearTimeout(t);
  }, [origin]);

  useEffect(() => {
    if (!destination || destination.length !== 4) {
      setDestInfo(null);
      setDestLookup("idle");
      return;
    }
    setDestLookup("loading");
    const t = setTimeout(async () => {
      try {
        const info = await airportAPI.getAirportInfo(destination.toUpperCase());
        if (info?.airport?.name) {
          setDestInfo(info.airport);
          setDestLookup("ok");
        } else {
          setDestInfo(null);
          setDestLookup("notfound");
        }
      } catch (e) {
        setDestInfo(null);
        setDestLookup("error");
      }
    }, 300);
    return () => clearTimeout(t);
  }, [destination]);

  // (Optional) In future we can auto-fill fields from live APIs when ICAO is valid

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


  // Demo input handler
  const fillDemo = () => {
    setOrigin("KORD");
    setDepMetar("KORD 271651Z 18005KT 10SM FEW020 SCT250 25/12 A3012 RMK AO2 SLP200");
    setDepTaf(`TAF KORD 271120Z 2712/2818 17008KT P6SM SCT025
      FM271800 20012KT P6SM BKN035
      FM280000 22010KT P6SM SCT050`);
    setDepNotam("RWY 10L/28R CLSD 1200-1800Z DLY; TWY B CLSD BTN B2 AND B3");
    setSigmets(`SIGMET NOVEMBER 2 VALID 271800/272200 KZNY- SEV TURB FCST BTN FL180 AND FL340
SIGMET OSCAR 1 VALID 271900/272300 KZLA- SEV ICE FCST BTN FL120 AND FL200`);
    setPireps(`UA /OV DCA270015 /TM 1920 /FL080 /TP B737 /TB MOD /IC NEG /SK BKN070-TOP090
UA /OV ORD180020 /TM 2000 /FL060 /TP E145 /TB LGT-MOD CHOP /IC NEG /SK SCT040`);
    setDestination("KSFO");
    setArrMetar("KSFO 271656Z 29010KT 10SM FEW008 SCT250 18/12 A3005 RMK AO2 SLP176");
    setArrTaf(`TAF KSFO 271130Z 2712/2818 30008KT P6SM FEW008 SCT250
      FM271800 32012KT P6SM BKN015
      FM280000 28010KT P6SM SCT020`);
    setArrNotam("RWY 28L/10R CLSD 1400-2000Z DLY; ILS RWY 28R U/S");
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
          <div className="form-row" style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <label className="label">Origin ICAO *</label>
            <input 
              className={`input`} 
              value={origin} 
              onChange={(e) => setOrigin(e.target.value.toUpperCase())} 
              placeholder="e.g. KORD" 
              maxLength={4} 
              required 
              style={{ flex: 1 }}
            />
            {/* Auto-Fill Wx button removed as requested */}
            {origin && origin.length === 4 && (
              <small style={{
                display: 'block', marginTop: 6,
                color: originLookup === 'ok' ? '#16a34a' : originLookup === 'loading' ? '#64748b' : originLookup === 'error' ? '#dc2626' : '#ea580c',
                fontWeight: 500
              }}>
                {originLookup === 'loading' && 'Looking up airport…'}
                {originLookup === 'ok' && `✓ ${originInfo?.name}`}
                {originLookup === 'notfound' && '⚠ Not in DB'}
                {originLookup === 'error' && '⚠ Lookup error'}
              </small>
            )}
            
          </div>
          <div className="form-row" style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <label className="label">METAR *</label>
            <textarea className="input textarea" value={depMetar} onChange={(e) => setDepMetar(e.target.value)} placeholder="Paste METAR report..." rows={2} required />
          </div>
          <div className="form-row">
            <label className="label">TAF *</label>
            <textarea className="input textarea" value={depTaf} onChange={(e) => setDepTaf(e.target.value)} placeholder="Paste TAF report..." rows={2} required />
          </div>
          <div className="form-row">
            <label className="label">NOTAMs (optional)</label>
            <textarea className="input textarea" value={depNotam} onChange={(e) => setDepNotam(e.target.value)} placeholder="Runway closures, taxiway restrictions..." rows={2} />
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
              className={`input`} 
              value={destination} 
              onChange={(e) => setDestination(e.target.value.toUpperCase())} 
              placeholder="e.g. KSFO" 
              maxLength={4} 
              required 
              style={{ flex: 1 }}
            />
            {/* Auto-Fill Wx button removed as requested */}
            {destination && destination.length === 4 && (
              <small style={{
                display: 'block', marginTop: 6,
                color: destLookup === 'ok' ? '#16a34a' : destLookup === 'loading' ? '#64748b' : destLookup === 'error' ? '#dc2626' : '#ea580c',
                fontWeight: 500
              }}>
                {destLookup === 'loading' && 'Looking up airport…'}
                {destLookup === 'ok' && `✓ ${destInfo?.name}`}
                {destLookup === 'notfound' && '⚠ Not in DB'}
                {destLookup === 'error' && '⚠ Lookup error'}
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
            <label className="label">NOTAMs (optional)</label>
            <textarea className="input textarea" value={arrNotam} onChange={(e) => setArrNotam(e.target.value)} placeholder="Runway availability, nav aid outages..." rows={2} />
          </div>
        </div>

        <div className="form-actions" style={{display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '18px'}}>
          <button type="button" onClick={fillDemo} className="btn btn-secondary" disabled={loading} style={{width: '100%'}}>Demo Input</button>
          <button type="button" onClick={clearForm} className="btn btn-ghost" disabled={loading} style={{width: '100%'}}>Clear</button>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{width: '100%'}}>{loading ? "Generating Briefing..." : "Get Briefing"}</button>
        </div>
        <div className="form-help">
          <p>* Required fields</p>
          <p>Enter any 4-letter ICAO airport code (e.g., KJFK, KSFO, KORD, KLAX).</p>
          <p>Paste METAR and TAF for each airport. NOTAMs are optional.</p>
        </div>
      </form>
    </div>
  );
}