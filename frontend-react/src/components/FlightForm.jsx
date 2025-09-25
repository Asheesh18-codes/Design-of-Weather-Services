import React, { useState } from "react";
import { parseWeather } from "../services/api";

export default function FlightForm({ onResult, onError }){
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [altitude, setAltitude] = useState("");
  const [pasted, setPasted] = useState("");
  const [loading, setLoading] = useState(false);

  const validICAO = (c) => /^[A-Za-z0-9]{4}$/.test((c||"").trim());

  const submit = async (e) => {
    e?.preventDefault();
    onError && onError(null);

    if (!origin && !pasted){ onError && onError("Provide origin ICAO or paste a coded report."); return; }
    if (origin && !validICAO(origin)){ onError && onError("Origin must be 4 characters."); return; }
    if (destination && !validICAO(destination)){ onError && onError("Destination must be 4 characters."); return; }

    setLoading(true);
    try {
      const payload = {
        origin: origin ? origin.trim().toUpperCase() : undefined,
        destination: destination ? destination.trim().toUpperCase() : undefined,
        altitude: altitude ? altitude.trim() : undefined,
        text: pasted ? pasted.trim() : undefined
      };
      const parsed = await parseWeather(payload);
      onResult(parsed);
    } catch(err){
      console.error(err);
      onError && onError(err?.message || "Failed to parse.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    const demo = {
      product: "METAR",
      raw: "KJFK 251651Z 18005KT 10SM CLR 25/12 A3012",
      parsed: { station: "KJFK", time: "251651Z", wind: "18005KT", lat: 40.6413, lon: -73.7781 },
      category: "Clear",
      summary: "KJFK: Clear skies, wind 180° at 5 kt, temp 25°C.",
      hf_summary: "No significant weather along route.",
      route: { origin:{icao:"KJFK",lat:40.6413,lon:-73.7781,label:"JFK"}, destination:{icao:"KSFO",lat:37.6213,lon:-122.379,label:"SFO"} },
      sigmet_geojson: null
    };
    onResult(demo);
  };

  return (
    <form onSubmit={submit}>
      <div className="form-row">
        <label className="label">Origin ICAO</label>
        <input className="input input-focus" placeholder="e.g. KJFK" value={origin} onChange={e=>setOrigin(e.target.value)} />
      </div>

      <div className="form-row">
        <label className="label">Destination ICAO <span style={{fontSize:12,color:"var(--muted)"}}>(optional)</span></label>
        <input className="input input-focus" placeholder="e.g. KSFO" value={destination} onChange={e=>setDestination(e.target.value)} />
      </div>

      <div className="form-row">
        <label className="label">Altitude <span style={{fontSize:12,color:"var(--muted)"}}>(optional)</span></label>
        <input className="input input-focus" placeholder="e.g. 350" value={altitude} onChange={e=>setAltitude(e.target.value)} />
      </div>

      <div className="form-row">
        <label className="label">Paste coded report <span style={{fontSize:12,color:"var(--muted)"}}>(METAR/TAF/NOTAM/PIREPs)</span></label>
        <textarea className="textarea-small input-focus" placeholder="Paste raw text here" value={pasted} onChange={e=>setPasted(e.target.value)} />
      </div>

      <div className="row" style={{marginTop:8}}>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Parsing…" : "Get Briefing"}</button>
        <button type="button" onClick={fillDemo} className="btn btn-ghost">Fill example</button>
        <button type="button" onClick={()=>{ setOrigin(""); setDestination(""); setAltitude(""); setPasted(""); onError && onError(null) }} className="btn btn-ghost" style={{marginLeft:"auto"}}>Reset</button>
      </div>
    </form>
  );
}
