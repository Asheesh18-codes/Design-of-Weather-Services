import React, { useState } from "react";
import FlightForm from "./components/FlightForm";
import { parseMetar, parseTaf, parseNotam } from "./services/aviationParsers";
import MapView from "./components/MapView";
import "./styles.css";

// Utility functions
function getSafe(obj, ...keys) {
  if (!obj) return undefined;
  let cur = obj;
  for (const k of keys) {
    if (cur == null) return undefined;
    cur = cur[k];
  }
  return cur;
}
function formatTemp(t) {
  if (t == null) return "-";
  return `${t}°C`;
}

export default function App() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  // Report selectors for Departure and Arrival
  const [depReport, setDepReport] = useState("metar");
  const [arrReport, setArrReport] = useState("metar");

  // ---------- demo payload (realistic shape expected by UI) ----------
  const sampleDemo = {
    product: "METAR",
    raw: "KJFK 251651Z 18005KT 10SM FEW020 SCT050 25/12 A3012 RMK AO2",
    parsed: {
      station: "KJFK",
      time: "2025-09-25T16:51:00Z",
      lat: 40.6413,
      lon: -73.7781,
      wind: "18005KT",
      temp_c: 25,
      dewpoint_c: 12,
      altimeter: "A3012"
    },
    data: {
      "Flight-Rules": "VFR",
      Visibility: { value: 10, units: "SM" },
      Clouds: [{ cover: "FEW", base_ft: 2000 }, { cover: "SCT", base_ft: 5000 }],
      Wind: { direction: 180, speed: 5, gust: null },
      Temperature: 25,
      Dewpoint: 12,
      Altimeter: "A3012"
    },
    summary: "KJFK: VFR. Wind 180° 5 kt, visibility 10 SM, FEW020, SCT050. Temp 25°C.",
    hf_summary: "Clear VFR. Nothing significant.",
    category: "Clear",
    route: {
      origin: { icao: "KJFK", lat: 40.6413, lon: -73.7781 },
      destination: { icao: "KSFO", lat: 37.6213, lon: -122.3790 }
    },
    sigmet_geojson: null
  };

  // Optional: auto-load demo on start (uncomment to enable)
  // useEffect(() => { setResult(sampleDemo); }, []);

  // ---------- parse handler ----------
  const onSubmit = async (payload) => {
    setLoading(true);
    setError(null);
    try {
      // Get airport coordinates
      const originCoords = getAirportCoordinates(payload.origin.icao);
      const destCoords = getAirportCoordinates(payload.destination.icao);
      
      // Create a result object from the form payload
      const formResult = {
        product: "FLIGHT_BRIEFING",
        origin: payload.origin,
        destination: payload.destination,
        enroute: payload.enroute,
        route: {
          origin: { 
            icao: payload.origin.icao, 
            lat: originCoords?.lat || 0, 
            lon: originCoords?.lon || 0 
          },
          destination: { 
            icao: payload.destination.icao, 
            lat: destCoords?.lat || 0, 
            lon: destCoords?.lon || 0 
          }
        },
        summary: `Flight briefing from ${payload.origin.icao} to ${payload.destination.icao}`,
        category: determineSeverity(payload), // Determine based on weather conditions
        parsed: {
          station: payload.origin.icao,
          icao: payload.origin.icao,
          lat: originCoords?.lat || 0,
          lon: originCoords?.lon || 0
        }
      };
      
      console.log('Form Result:', formResult); // Debug log
      setResult(formResult);
    } catch (err) {
      console.error('Submit error:', err); // Debug log
      setError(err?.message || "Failed to generate flight briefing");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine severity based on weather conditions
  const determineSeverity = (payload) => {
    // Check for severe weather indicators
    const depMetar = payload.origin?.metar || '';
    const arrMetar = payload.destination?.metar || '';
    const sigmets = payload.enroute?.sigmets || '';
    
    // Look for severe conditions
    if (depMetar.includes('TS') || arrMetar.includes('TS') || sigmets.includes('severe')) {
      return 'Severe';
    }
    // Look for significant conditions  
    if (depMetar.includes('-RA') || arrMetar.includes('-RA') || depMetar.includes('BKN') || arrMetar.includes('BKN')) {
      return 'Significant';
    }
    // Otherwise clear
    return 'Clear';
  };

  // Helper function to get airport coordinates
  const getAirportCoordinates = (icao) => {
    const airports = {
      'KJFK': { lat: 40.6413, lon: -73.7781 },
      'KSFO': { lat: 37.6213, lon: -122.3790 },
      'KORD': { lat: 41.9742, lon: -87.9073 },
      'KDEN': { lat: 39.8561, lon: -104.6737 },
      'KLAX': { lat: 33.9425, lon: -118.4081 }
    };
    return airports[icao] || null;
  };

  // ---------- helper getters ----------
  const getField = (name) => {
    return getSafe(result, "data", name) ?? getSafe(result, "parsed", name) ?? getSafe(result, name);
  };
  const flightRules = getField("flight_rules") ?? getField("Flight-Rules") ?? getSafe(result, "translations", "flight_rules") ?? "-";
  const visibility = (() => {
    const v = getField("visibility") ?? getField("Visibility") ?? getField("visibility_token") ?? "-";
    if (v && typeof v === "object") {
      if (v.value !== undefined) return `${v.value} ${v.units ?? ""}`;
      return JSON.stringify(v);
    }
    return v;
  })();
  const altimeter = getField("altimeter") ?? getField("Altimeter") ?? getField("altimeter_hpa") ?? getField("altimeter_in") ?? getField("alt") ?? "-";
  const tempC = getField("temperature_c") ?? getField("Temperature") ?? getField("temp_c") ?? getField("temp") ?? null;
  const dewC = getField("dewpoint_c") ?? getField("Dewpoint") ?? getField("dewpoint") ?? null;
  const wind = getField("wind") ?? getField("Wind") ?? getField("wind_token") ?? "-";
  const gust = (() => {
    const w = getField("wind");
    if (!w) return null;
    if (typeof w === "object") return w.gust ?? w.Gust ?? null;
    const tok = (getField("wind_token") || "").toString();
    const m = tok.match(/G(\d{2,3})/);
    return m ? Number(m[1]) : null;
  })();
  const clouds = (() => {
    const c = getField("clouds") ?? getField("Clouds") ?? getField("clouds_token");
    if (!c) return [];
    if (Array.isArray(c)) {
      return c.map((cl) => {
        if (typeof cl === "string") return cl;
        const cover = cl.cover ?? cl.type ?? cl.summary ?? cl[0] ?? "CLOUD";
        const base = cl.base_ft ?? (cl.base_hundreds_ft ? cl.base_hundreds_ft * 100 : cl.base_ft) ?? cl.base ?? cl.height ?? "";
        return `${cover} ${base ? `${base} ft` : ""}`.trim();
      });
    }
    if (typeof c === "string") {
      const parts = c.trim().split(/\s+/).filter(Boolean);
      return parts;
    }
    return [JSON.stringify(c)];
  })();
  const station = getField("station") ?? getSafe(result, "parsed", "station") ?? getSafe(result, "parsed", "station_id") ?? getSafe(result, "parsed", "icao") ?? "-";
  const obsTime = getField("time") ?? getField("Time") ?? getSafe(result, "parsed", "time") ?? getSafe(result, "parsed", "observation_time") ?? "-";

  // ---------- UI ----------
  return (
    <div className="container">
      <header className="header">
        <div className="brand">
          <div className="brand-logo">WS</div>
          <div>
            <div className="header-title">Design of Weather Services</div>
            <div className="header-sub">Pilot briefing — concise METAR/TAF/NOTAM summaries and route map.</div>
          </div>
        </div>

        <div className="status-indicator">
          {error && <span className="status-badge status-error">Error</span>}
          {!result && !error && <span className="status-badge status-pending">{loading ? "Parsing…" : "Idle"}</span>}
          {result && !error && <span className="status-badge status-ready">Briefing Ready</span>}
        </div>
      </header>

      <main className="grid">
        <aside>
          <div className="card card-hero">
            <h3 style={{ marginTop: 0 }}>Pilot Input</h3>
            <FlightForm onSubmit={onSubmit} onError={setError} loading={loading} />
          </div>

          <div style={{ height: 12 }} />

          <div className="card">
            <h4 style={{ marginTop: 0 }}>Quick tips</h4>
            <ul style={{ color: "var(--muted)", fontSize: 13, marginTop: 8 }}>
              <li>Enter ICAO codes (e.g. KJFK, KSFO) or paste a coded report.</li>
              <li>METAR = current, TAF = forecast, NOTAM = restrictions.</li>
              <li>Use the "Fill example" for a quick demo.</li>
            </ul>

            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => setResult(sampleDemo)} className="btn btn-ghost" style={{width:'100%'}}>Load Demo</button>
              <button onClick={() => { setResult(null); setError(null); }} className="btn btn-ghost" style={{width:'100%'}}>Clear Demo</button>
            </div>
          </div>
        </aside>

        <section>
          <div className="card">
            <div className="space-between">
              <div>
                <h3 style={{ margin: 0 }}>Parsed Summary</h3>
                <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>Human-friendly decoded weather products</div>
              </div>

              <div className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {result && <span className={`product-badge ${(result.product || "metar").toLowerCase()}`}>{result.product || "METAR"}</span>}
                <button onClick={() => { setResult(null); setError(null); }} className="btn btn-ghost">Clear</button>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              {!result && !error && <div className="muted">No briefing yet — submit the form.</div>}
              {error && <div style={{ color: "#c53030", marginBottom: 8 }}>{error}</div>}

              {result && (
                <>
                  <div className="summary-grid" style={{ marginTop: 12 }}>
                    <div className="summary-block">
                      <div className="summary-title">Overview</div>
                      <div className="summary-text">{ result.summary ?? result.data?.summary ?? result.hf_summary ?? "-" }</div>
                      { result.hf_summary && <blockquote style={{ color: "#b45309", marginTop: 8 }}>{result.hf_summary}</blockquote> }

                      <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ fontWeight: 600 }}>Category:</div>
                        {result.category === "Clear" && <div className="category-badge badge-clear"><span className="badge-dot" /> <span className="badge-text">Clear</span></div>}
                        {result.category === "Significant" && <div className="category-badge badge-significant"><span className="badge-dot" /> <span className="badge-text">Significant</span></div>}
                        {result.category === "Severe" && <div className="category-badge badge-severe"><span className="badge-dot" /> <span className="badge-text">Severe</span></div>}
                        {!result.category && <div className="category-badge" style={{ background: "#f3f4f6", color: "#0f172a"}}><span className="badge-dot" style={{ background: "#94a3b8" }} /> Unknown</div>}
                      </div>
                    </div>

                    <div className="summary-block">
                      <div className="summary-title">Station / Route</div>
                      <div className="summary-text">
                        <div className="kv">Station: <span className="val">{station}</span></div>
                        <div className="kv" style={{ marginTop: 6 }}>Time: <span className="val">{obsTime}</span></div>
                        <div className="kv" style={{ marginTop: 6 }}>Flight rules: <span className="val">{flightRules}</span></div>
                        <div className="kv" style={{ marginTop: 6 }}>Visibility: <span className="val">{visibility}</span></div>
                        <div className="kv" style={{ marginTop: 6 }}>Altimeter: <span className="val">{altimeter}</span></div>
                        <div className="kv" style={{ marginTop: 6 }}>Wind: <span className="val">{ typeof wind === "object" ? (wind.direction ?? wind.dir ?? JSON.stringify(wind)) : (wind ?? "-") }{ gust ? ` (gusts ${gust} kt)` : "" }</span></div>
                      </div>
                    </div>

                    <div className="summary-block">
                      <div className="summary-title">Detailed Weather</div>
                      <div style={{ fontSize: 14, color: "#13303a" }}>
                        <div className="kv">Temperature: <span className="val">{ formatTemp(tempC) }</span></div>
                        <div className="kv" style={{marginTop:6}}>Dew point: <span className="val">{ formatTemp(dewC) }</span></div>
                        <div style={{ marginTop:8 }}>
                          <div style={{ fontWeight:700, marginBottom:6 }}>Clouds</div>
                          {clouds.length === 0 ? <div className="muted">No significant clouds reported</div> : (
                            <ul style={{ margin:0, paddingLeft:18 }}>
                              {clouds.map((c, i) => <li key={i} style={{ marginBottom:6 }}>{c}</li>)}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ height: 12 }} />
                  {/* Grouped Pilot Weather/Ops Package UI */}
                  <div className="card aviation-summary-card">
                    <div className="aviation-summary-header">🛫 Departure</div>
                    <div style={{marginBottom: '12px'}}>
                      <label style={{fontWeight:600, marginRight:12}}>Select Report:</label>
                      <label style={{marginRight:10}}>
                        <input type="radio" name="depReport" value="metar" checked={depReport === "metar"} onChange={() => setDepReport("metar")} /> METAR
                      </label>
                      <label style={{marginRight:10}}>
                        <input type="radio" name="depReport" value="taf" checked={depReport === "taf"} onChange={() => setDepReport("taf")} /> TAF
                      </label>
                      <label>
                        <input type="radio" name="depReport" value="notams" checked={depReport === "notams"} onChange={() => setDepReport("notams")} /> NOTAMs
                      </label>
                    </div>
                    <div className="aviation-summary-blocks">
                      <div className="aviation-summary-block">
                        <div className="aviation-summary-title metar">Origin ICAO</div>
                        <div className="aviation-summary-text">{result?.origin?.icao}</div>
                      </div>
                      {depReport === "metar" && (
                        <div className="aviation-summary-block">
                          <div className="aviation-summary-title metar">METAR</div>
                          {(() => {
                            const metarData = result?.origin?.metar ? parseMetar(result.origin.metar) : null;
                            if (!metarData) return <div className="aviation-summary-text">No METAR data available</div>;
                            return (
                              <>
                                <div className="aviation-summary-text" style={{marginBottom: '8px'}}>
                                  <strong>Conditions:</strong> {metarData.parsed?.flightRules || 'Unknown'} 
                                  {metarData.parsed?.temperature && ` | ${metarData.parsed.temperature}/${metarData.parsed.dewpoint}`}
                                </div>
                                <div className="aviation-summary-text" style={{marginBottom: '8px'}}>
                                  <strong>Wind:</strong> {metarData.parsed?.wind || 'Unknown'}<br/>
                                  <strong>Visibility:</strong> {metarData.parsed?.visibility || 'Unknown'}<br/>
                                  <strong>Clouds:</strong> {metarData.parsed?.clouds || 'Unknown'}<br/>
                                  <strong>Weather:</strong> {metarData.parsed?.weather || 'None'}
                                </div>
                                <div className="aviation-summary-raw" style={{fontSize: '11px', color: '#666', background: '#f8f9fa', padding: '8px', borderRadius: '4px', fontFamily: 'monospace'}}>
                                  {metarData.raw}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                      {depReport === "taf" && (
                        <div className="aviation-summary-block">
                          <div className="aviation-summary-title taf">TAF</div>
                          {(() => {
                            const tafData = result?.origin?.taf ? parseTaf(result.origin.taf) : null;
                            if (!tafData) return <div className="aviation-summary-text">No TAF data available</div>;
                            return (
                              <>
                                <div className="aviation-summary-text" style={{marginBottom: '8px'}}>
                                  <strong>Valid Period:</strong> {tafData.parsed?.validPeriod || 'Unknown'}<br/>
                                  <strong>Forecast Periods:</strong> {tafData.parsed?.periods?.length || 0}
                                </div>
                                {tafData.parsed?.periods?.slice(0, 2).map((period, idx) => (
                                  <div key={idx} style={{marginBottom: '6px', padding: '6px', background: '#f0f9ff', borderRadius: '4px'}}>
                                    <div><strong>{period.type}:</strong></div>
                                    <div>Wind: {period.wind}</div>
                                    <div>Visibility: {period.visibility}</div>
                                    <div>Clouds: {period.clouds}</div>
                                    {period.weather !== "No significant weather" && <div>Weather: {period.weather}</div>}
                                  </div>
                                ))}
                                <div className="aviation-summary-raw" style={{fontSize: '11px', color: '#666', background: '#f8f9fa', padding: '8px', borderRadius: '4px', fontFamily: 'monospace'}}>
                                  {tafData.raw}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                      {depReport === "notams" && (
                        <div className="aviation-summary-block">
                          <div className="aviation-summary-title notam">NOTAMs</div>
                          {(() => {
                            const notamData = result?.origin?.notams ? parseNotam(result.origin.notams) : null;
                            if (!notamData) return <div className="aviation-summary-text">No NOTAM data available</div>;
                            return (
                              <>
                                <div className="aviation-summary-text" style={{marginBottom: '8px'}}>
                                  <strong>NOTAM ID:</strong> {notamData.parsed?.id || 'Unknown'}<br/>
                                  <strong>Category:</strong> {notamData.parsed?.category || 'Unknown'}<br/>
                                  <strong>Impact:</strong> <span style={{color: notamData.parsed?.severity === 'High' ? '#dc2626' : notamData.parsed?.severity === 'Medium' ? '#ea580c' : '#16a34a'}}>{notamData.parsed?.severity || 'Unknown'}</span>
                                </div>
                                <div className="aviation-summary-text" style={{marginBottom: '8px'}}>
                                  <strong>Details:</strong> {notamData.parsed?.details || 'No details available'}<br/>
                                  {notamData.parsed?.effectiveDate && (
                                    <>
                                      <strong>Effective:</strong> {notamData.parsed.effectiveDate}<br/>
                                      <strong>Expires:</strong> {notamData.parsed.expiryDate}<br/>
                                    </>
                                  )}
                                  {notamData.parsed?.additionalInfo && (
                                    <>
                                      <strong>Note:</strong> {notamData.parsed.additionalInfo}
                                    </>
                                  )}
                                </div>
                                <div className="aviation-summary-raw" style={{fontSize: '11px', color: '#666', background: '#f8f9fa', padding: '8px', borderRadius: '4px', fontFamily: 'monospace'}}>
                                  {notamData.raw}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                      {result?.origin?.runwayData && (
                        <div className="aviation-summary-block">
                          <div className="aviation-summary-title">Runway/Performance Data</div>
                          <div className="aviation-summary-text">{result?.origin?.runwayData}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ height: 12 }} />
                  <div className="card aviation-summary-card">
                    <div className="aviation-summary-header">✈️ Enroute Essentials</div>
                    <div className="aviation-summary-blocks">
                      {result?.enroute?.sigmets && (
                        <div className="aviation-summary-block">
                          <div className="aviation-summary-title sigmet">SIGMETs</div>
                          <div className="aviation-summary-text">{result?.enroute?.sigmets}</div>
                        </div>
                      )}
                      {result?.enroute?.pireps && (
                        <div className="aviation-summary-block">
                          <div className="aviation-summary-title pirep">PIREPs</div>
                          <div className="aviation-summary-text">{result?.enroute?.pireps}</div>
                        </div>
                      )}
                      {result?.enroute?.notams && (
                        <div className="aviation-summary-block">
                          <div className="aviation-summary-title notam">Enroute NOTAMs</div>
                          <div className="aviation-summary-text">{result?.enroute?.notams}</div>
                        </div>
                      )}
                      {!result?.enroute?.sigmets && !result?.enroute?.pireps && !result?.enroute?.notams && (
                        <div className="aviation-summary-text">No enroute data provided.</div>
                      )}
                    </div>
                  </div>
                  <div style={{ height: 12 }} />
                  <div className="card aviation-summary-card">
                    <div className="aviation-summary-header">🛬 Arrival</div>
                    <div style={{marginBottom: '12px'}}>
                      <label style={{fontWeight:600, marginRight:12}}>Select Report:</label>
                      <label style={{marginRight:10}}>
                        <input type="radio" name="arrReport" value="metar" checked={arrReport === "metar"} onChange={() => setArrReport("metar")} /> METAR
                      </label>
                      <label style={{marginRight:10}}>
                        <input type="radio" name="arrReport" value="taf" checked={arrReport === "taf"} onChange={() => setArrReport("taf")} /> TAF
                      </label>
                      <label>
                        <input type="radio" name="arrReport" value="notams" checked={arrReport === "notams"} onChange={() => setArrReport("notams")} /> NOTAMs
                      </label>
                    </div>
                    <div className="aviation-summary-blocks">
                      <div className="aviation-summary-block">
                        <div className="aviation-summary-title metar">Destination ICAO</div>
                        <div className="aviation-summary-text">{result?.destination?.icao}</div>
                      </div>
                      {arrReport === "metar" && (
                        <div className="aviation-summary-block">
                          <div className="aviation-summary-title metar">METAR</div>
                          {(() => {
                            const metarData = result?.destination?.metar ? parseMetar(result.destination.metar) : null;
                            if (!metarData) return <div className="aviation-summary-text">No METAR data available</div>;
                            return (
                              <>
                                <div className="aviation-summary-text" style={{marginBottom: '8px'}}>
                                  <strong>Conditions:</strong> {metarData.parsed?.flightRules || 'Unknown'} 
                                  {metarData.parsed?.temperature && ` | ${metarData.parsed.temperature}/${metarData.parsed.dewpoint}`}
                                </div>
                                <div className="aviation-summary-text" style={{marginBottom: '8px'}}>
                                  <strong>Wind:</strong> {metarData.parsed?.wind || 'Unknown'}<br/>
                                  <strong>Visibility:</strong> {metarData.parsed?.visibility || 'Unknown'}<br/>
                                  <strong>Clouds:</strong> {metarData.parsed?.clouds || 'Unknown'}<br/>
                                  <strong>Weather:</strong> {metarData.parsed?.weather || 'None'}
                                </div>
                                <div className="aviation-summary-raw" style={{fontSize: '11px', color: '#666', background: '#f8f9fa', padding: '8px', borderRadius: '4px', fontFamily: 'monospace'}}>
                                  {metarData.raw}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                      {arrReport === "taf" && (
                        <div className="aviation-summary-block">
                          <div className="aviation-summary-title taf">TAF</div>
                          {(() => {
                            const tafData = result?.destination?.taf ? parseTaf(result.destination.taf) : null;
                            if (!tafData) return <div className="aviation-summary-text">No TAF data available</div>;
                            return (
                              <>
                                <div className="aviation-summary-text" style={{marginBottom: '8px'}}>
                                  <strong>Valid Period:</strong> {tafData.parsed?.validPeriod || 'Unknown'}<br/>
                                  <strong>Forecast Periods:</strong> {tafData.parsed?.periods?.length || 0}
                                </div>
                                {tafData.parsed?.periods?.slice(0, 2).map((period, idx) => (
                                  <div key={idx} style={{marginBottom: '6px', padding: '6px', background: '#f0f9ff', borderRadius: '4px'}}>
                                    <div><strong>{period.type}:</strong></div>
                                    <div>Wind: {period.wind}</div>
                                    <div>Visibility: {period.visibility}</div>
                                    <div>Clouds: {period.clouds}</div>
                                    {period.weather !== "No significant weather" && <div>Weather: {period.weather}</div>}
                                  </div>
                                ))}
                                <div className="aviation-summary-raw" style={{fontSize: '11px', color: '#666', background: '#f8f9fa', padding: '8px', borderRadius: '4px', fontFamily: 'monospace'}}>
                                  {tafData.raw}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                      {arrReport === "notams" && (
                        <div className="aviation-summary-block">
                          <div className="aviation-summary-title notam">NOTAMs</div>
                          {(() => {
                            const notamData = result?.destination?.notams ? parseNotam(result.destination.notams) : null;
                            if (!notamData) return <div className="aviation-summary-text">No NOTAM data available</div>;
                            return (
                              <>
                                <div className="aviation-summary-text" style={{marginBottom: '8px'}}>
                                  <strong>NOTAM ID:</strong> {notamData.parsed?.id || 'Unknown'}<br/>
                                  <strong>Category:</strong> {notamData.parsed?.category || 'Unknown'}<br/>
                                  <strong>Impact:</strong> <span style={{color: notamData.parsed?.severity === 'High' ? '#dc2626' : notamData.parsed?.severity === 'Medium' ? '#ea580c' : '#16a34a'}}>{notamData.parsed?.severity || 'Unknown'}</span>
                                </div>
                                <div className="aviation-summary-text" style={{marginBottom: '8px'}}>
                                  <strong>Details:</strong> {notamData.parsed?.details || 'No details available'}<br/>
                                  {notamData.parsed?.effectiveDate && (
                                    <>
                                      <strong>Effective:</strong> {notamData.parsed.effectiveDate}<br/>
                                      <strong>Expires:</strong> {notamData.parsed.expiryDate}<br/>
                                    </>
                                  )}
                                  {notamData.parsed?.additionalInfo && (
                                    <>
                                      <strong>Note:</strong> {notamData.parsed.additionalInfo}
                                    </>
                                  )}
                                </div>
                                <div className="aviation-summary-raw" style={{fontSize: '11px', color: '#666', background: '#f8f9fa', padding: '8px', borderRadius: '4px', fontFamily: 'monospace'}}>
                                  {notamData.raw}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ height: 18 }} />

          <div className="card">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <h3 style={{ margin:0 }}>Map: Origin → Destination</h3>
              <div className="muted">Interactive map — zoom & pan</div>
            </div>

            <div className="map-wrapper">
              { result ? (
                <MapView
                  origin={ result?.route?.origin || (result?.parsed && { icao: result.parsed.station, lat: result.parsed.lat, lon: result.parsed.lon }) }
                  destination={ result?.route?.destination || null }
                  sigmetGeojson={ result?.sigmet_geojson || null }
                  severity={ result?.category || null }
                />
              ) : (
                <div className="map-fallback">Map will show route after parsing</div>
              )}
            </div>

            <div className="map-legend">
              <div className="legend-item"><span className="dot dot-green" /> Clear</div>
              <div className="legend-item"><span className="dot dot-yellow" /> Significant</div>
              <div className="legend-item"><span className="dot dot-red" /> Severe</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
