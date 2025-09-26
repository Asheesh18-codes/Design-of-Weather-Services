
import React, { useState } from "react";

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

  const fillDemo = () => {
    setOrigin("KORD");
    setDepMetar("METAR KORD 261951Z 22015KT 10SM FEW040 SCT080 BKN250 22/14 A2992");
    setDepTaf("TAF KORD 261740Z 2618/2724 22015KT P6SM SCT050 BKN120\nFM270000 21012KT 6SM -RA BKN030 OVC080");
    setDepNotam("RWY 04L/22R CLSD");
  setSigmets("SIGMET R2 VALID 261800/262200 KZNY- KORD severe turbulence");
  setPireps("UA /OV ORD270015 /TM 1920 /FL080 /TP B737 /TB MOD /IC NEG /SK BKN070-TOP090");
    setDestination("KSFO");
    setArrMetar("METAR KSFO 261951Z 30012KT 10SM SCT015 18/12 A3001");
    setArrTaf("TAF KSFO 261740Z 2618/2724 30012KT P6SM SCT015 BKN120");
    setArrNotam("RWY 28L/10R CLSD");
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
    const now = new Date();
    now.setHours(now.getHours() + 1);
    setDepartureTime(now.toISOString().slice(0, 16));
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
            <input className="input" value={origin} onChange={(e) => setOrigin(e.target.value.toUpperCase())} placeholder="e.g. KORD" maxLength={4} required />
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
            <input className="input" value={destination} onChange={(e) => setDestination(e.target.value.toUpperCase())} placeholder="e.g. KSFO" maxLength={4} required />
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
          <button type="button" onClick={fillDemo} className="btn btn-primary" disabled={loading} style={{width: '100%'}}>Enter Details</button>
          <button type="button" onClick={clearForm} className="btn btn-ghost" disabled={loading} style={{width: '100%'}}>Clear</button>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{width: '100%'}}>{loading ? "Generating Briefing..." : "Get Briefing"}</button>
        </div>
        <div className="form-help">
          <p>* Required fields</p>
          <p>Enter valid 4-letter ICAO airport codes (e.g., KORD for Chicago O'Hare, KSFO for San Francisco)</p>
        </div>
      </form>
    </div>
  );
}