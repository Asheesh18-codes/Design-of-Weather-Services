import React, { useState } from "react";
import FlightForm from "./components/FlightForm";
import { useCallback } from "react";
import { parseMetar, parseTaf, parseNotam, parsePirep, parseSigmet } from "./services/aviationParsers";
import MapView from "./components/MapView";
import "./styles.css";
import { flightPlanAPI, airportAPI } from "./services/api";

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
  const [liveWeather, setLiveWeather] = useState({ depMetar: '', arrMetar: '', depTaf: '', arrTaf: '', depNotam: '', arrNotam: '', sigmets: '', pireps: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState(null); // { airports:'ok'|'fail', flightplan:'ok'|'fail', message? }
  // Report selectors for Departure and Arrival
  const [depReport, setDepReport] = useState("metar");
  const [arrReport, setArrReport] = useState("metar");

  // (Demo code removed for production flow)

  // ---------- parse handler ----------
  const onSubmit = async (payload) => {
    setLoading(true);
    setError(null);
    try {
      // 1) Try to generate a flight plan via backend (this resolves ICAO -> lat/lon from airports.json)
      let flightResp;
      try {
        flightResp = await flightPlanAPI.generateWaypoints({
          origin: { icao: payload.origin.icao },
          destination: { icao: payload.destination.icao },
          altitude: payload.altitude || 35000
        });
      } catch (e) {
        console.warn('Flight plan API failed, falling back to direct airport lookup');
      }

      if (flightResp && flightResp.success) {
        // Merge the flight plan response with the user's weather inputs for display
        const merged = {
          ...flightResp,
          product: "FLIGHT_BRIEFING",
          origin: payload.origin,
          destination: payload.destination,
          enroute: payload.enroute,
          summary: flightResp.summary || `Flight briefing from ${payload.origin.icao} to ${payload.destination.icao}`,
          category: determineSeverity(payload) || flightResp.category
        };
        setResult(merged);
        return;
      }

      // 2) Fallback path: resolve coordinates directly via airport API
      const [origRes, destRes] = await Promise.all([
        airportAPI.getCoordinates(payload.origin.icao),
        airportAPI.getCoordinates(payload.destination.icao)
      ]);

      const originCoords = origRes && origRes.success ? { lat: origRes.lat, lon: origRes.lon } : null;
      const destCoords = destRes && destRes.success ? { lat: destRes.lat, lon: destRes.lon } : null;

      if (!originCoords || !destCoords) {
        throw new Error('Could not resolve airport coordinates from backend database.');
      }

      const formResult = {
        product: "FLIGHT_BRIEFING",
        origin: payload.origin,
        destination: payload.destination,
        enroute: payload.enroute,
        route: {
          origin: { icao: payload.origin.icao, ...originCoords },
          destination: { icao: payload.destination.icao, ...destCoords }
        },
        summary: `Flight briefing from ${payload.origin.icao} to ${payload.destination.icao}`,
        category: determineSeverity(payload),
        parsed: {
          station: payload.origin.icao,
          icao: payload.origin.icao,
          lat: originCoords.lat,
          lon: originCoords.lon
        }
      };

      setResult(formResult);
    } catch (err) {
      console.error('Submit error:', err);
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

  // Coordinates are now retrieved from backend APIs; local hardcoded map removed.

  // ---------- helper getters ----------
  // If liveWeather is filled, use it for preview
  const previewWeather = liveWeather.depMetar || liveWeather.arrMetar || liveWeather.depTaf || liveWeather.arrTaf || liveWeather.sigmets || liveWeather.pireps ? liveWeather : null;
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
  // If previewWeather is present, parse and show live weather summary
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
          <div className="card card-hero sidebar-modern" style={{
            boxShadow: '0 8px 32px rgba(16,24,40,0.12)',
            border: 'none',
            background: 'linear-gradient(135deg,#f7fbfc 80%,#e0f2fe 100%)',
            padding: '32px 20px 24px 20px',
            borderRadius: '26px',
            marginBottom: '20px',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '100px'
          }}>
            <div style={{
              position: 'absolute',
              top: '-40px',
              right: '-40px',
              width: '120px',
              height: '120px',
              background: 'radial-gradient(circle at 60% 40%, #bae6fd 0%, #e0f2fe 80%, transparent 100%)',
              zIndex: 0,
              opacity: 0.7
            }} />
            <h3 style={{
              marginTop: 0,
              fontSize: '1.35rem',
              fontWeight: 800,
              color: 'var(--accent-600)',
              letterSpacing: '0.01em',
              marginBottom: '18px',
              zIndex: 1,
              position: 'relative',
              textShadow: '0 2px 12px #e0f2fe, 0 1px 0 #fff'
            }}>Pilot Input</h3>
            <div style={{zIndex:1,position:'relative'}}>
              <FlightForm
                onSubmit={onSubmit}
                onError={setError}
                loading={loading}
                onWeatherChange={setLiveWeather}
              />
      {/* Live Weather Preview (dynamic) */}
      {previewWeather && (
        <div className="card" style={{marginBottom:18, background:'#f0fdfa', border:'1.5px solid #bae6fd'}}>
          <h4 style={{marginTop:0, color:'var(--accent-600)'}}>Live Weather Preview</h4>
          <div style={{fontSize:13, color:'#0f172a'}}>
            <div>
              <strong>Departure METAR:</strong> {previewWeather.depMetar ? (parseMetar(previewWeather.depMetar)?.summary || previewWeather.depMetar) : '—'}
            </div>
            <div>
              <strong>Departure TAF:</strong> {previewWeather.depTaf ? (parseTaf(previewWeather.depTaf)?.summary || previewWeather.depTaf) : '—'}
            </div>
            <div>
              <strong>Arrival METAR:</strong> {previewWeather.arrMetar ? (parseMetar(previewWeather.arrMetar)?.summary || previewWeather.arrMetar) : '—'}
            </div>
            <div>
              <strong>Arrival TAF:</strong> {previewWeather.arrTaf ? (parseTaf(previewWeather.arrTaf)?.summary || previewWeather.arrTaf) : '—'}
            </div>
            <div><strong>SIGMETs:</strong> {previewWeather.sigmets || '—'}</div>
            <div><strong>PIREPs:</strong> {previewWeather.pireps || '—'}</div>
          </div>
        </div>
      )}
            </div>
          </div>
          <div style={{ height: 12 }} />

          <div className="card">
            <h4 style={{ marginTop: 0 }}>Quick tips</h4>
            <ul style={{ color: "var(--muted)", fontSize: 13, marginTop: 8 }}>
              <li>Enter ICAO codes (e.g. KJFK, KSFO) or paste a coded report.</li>
              <li>METAR = current, TAF = forecast, NOTAM = restrictions.</li>
              <li>Paste real METAR/TAF data for best results.</li>
            </ul>

            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                className="btn btn-ghost"
                onClick={async () => {
                  setTesting(true);
                  setTestStatus(null);
                  try {
                    // Test airports endpoint with a common ICAO
                    let airportsOk = 'fail';
                    try {
                      const a = await airportAPI.getCoordinates('KJFK');
                      airportsOk = a?.success && a?.lat && a?.lon ? 'ok' : 'fail';
                    } catch { airportsOk = 'fail'; }

                    // Test flightplan generation with two well-known airports
                    let flightplanOk = 'fail';
                    try {
                      const fp = await flightPlanAPI.generateWaypoints({
                        origin: { icao: 'KJFK' },
                        destination: { icao: 'KLAX' },
                        altitude: 35000
                      });
                      flightplanOk = fp?.success && (fp?.route?.origin?.lat ?? fp?.waypoints?.length > 0) ? 'ok' : 'fail';
                    } catch { flightplanOk = 'fail'; }

                    setTestStatus({ airports: airportsOk, flightplan: flightplanOk });
                  } catch (e) {
                    setTestStatus({ airports: 'fail', flightplan: 'fail', message: e?.message || 'Unknown error' });
                  } finally {
                    setTesting(false);
                  }
                }}
                disabled={testing}
              >
                {testing ? 'Testing endpoints…' : 'Test endpoints'}
              </button>

              {testStatus && (
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', fontSize:12 }}>
                  <span className={`status-badge ${testStatus.airports==='ok' ? 'status-ready' : 'status-error'}`}>
                    Airports API: {testStatus.airports==='ok' ? 'OK' : 'FAIL'}
                  </span>
                  <span className={`status-badge ${testStatus.flightplan==='ok' ? 'status-ready' : 'status-error'}`}>
                    Flightplan API: {testStatus.flightplan==='ok' ? 'OK' : 'FAIL'}
                  </span>
                  {testStatus.message && (
                    <span className="status-badge status-error">{testStatus.message}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        <section>
          {/* Aviation Weather Briefing Summary - Demo.js inspired structure */}
          <div className="card">
            <div className="space-between">
              <div>
                <h3 style={{ margin: 0 }}>🛩️ Aviation Weather Briefing</h3>
                <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>Comprehensive Flight Weather Analysis</div>
              </div>

              <div className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {result && <span className={`product-badge ${(result.product || "briefing").toLowerCase()}`}>{result.product || "BRIEFING"}</span>}
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {new Date().toLocaleDateString()} • {new Date().toLocaleTimeString()}
                </div>
                <button onClick={() => { setResult(null); setError(null); }} className="btn btn-ghost">Clear</button>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              {!result && !error && (
                <div className="aviation-welcome">
                  <div className="muted" style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>✈️</div>
                    <h4>Welcome to Aviation Weather Services</h4>
                    <p>Submit flight details in the left panel to generate your comprehensive weather briefing</p>
                    <div style={{ marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
                      Available Reports: METAR • TAF • NOTAMs • SIGMETs • PIREPs
                    </div>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="error-display" style={{ color: "#c53030", marginBottom: 8, padding: 16, background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
                  <strong>⚠️ Error:</strong> {error}
                </div>
              )}

              {result && (
                <>
                  {/* Flight Overview Section */}
                  <div className="aviation-section" style={{ marginBottom: 24, background: '#f8fafc', borderRadius: 14, boxShadow: '0 2px 12px #e0e7ef33', padding: 24 }}>
                    <div className="aviation-section-header" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: 18,
                      paddingBottom: 10,
                      borderBottom: '2px solid #e5e7eb',
                      background: 'linear-gradient(90deg,#e0f2fe 0%,#f8fafc 100%)',
                      borderRadius: 10
                    }}>
                      <span style={{ fontSize: 24, color: '#2563eb' }}>📋</span>
                      <h3 style={{ margin: 0, color: 'var(--accent-700)', fontWeight: 800, fontSize: 22, letterSpacing: 0.5 }}>Flight Overview</h3>
                    </div>
                    <div className="summary-grid" style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 32 }}>
                      <div className="summary-block" style={{ minWidth: 220, flex: 1, background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px #e0e7ef33', padding: 18, border: '1px solid #e5e7eb' }}>
                        <div className="summary-title" style={{ fontWeight: 700, color: '#2563eb', fontSize: 15, marginBottom: 8 }}>Route Information</div>
                        <div className="summary-text" style={{ fontSize: 15, color: '#13303a' }}>
                          <div className="kv"><strong>Origin:</strong> <span className="val">{result?.route?.origin?.icao || station}</span></div>
                          <div className="kv" style={{ marginTop: 6 }}><strong>Destination:</strong> <span className="val">{result?.route?.destination?.icao || "-"}</span></div>
                          <div className="kv" style={{ marginTop: 6 }}><strong>Flight Rules:</strong> <span className="val">{flightRules}</span></div>
                          <div className="kv" style={{ marginTop: 6 }}><strong>Generated:</strong> <span className="val">{obsTime}</span></div>
                          {Array.isArray(result?.waypoints) && result.waypoints.length > 0 && (
                            <div className="kv" style={{ marginTop: 6 }}>
                              <strong>Waypoints:</strong>
                              <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: 14 }}>
                                {result.waypoints.map((wp, idx) => (
                                  <li key={idx} style={{ marginBottom: 2 }}>
                                    {wp.icao ? `${wp.icao}` : wp.name || `WP${idx+1}`}
                                    {wp.lat && wp.lon ? ` (${wp.lat.toFixed(2)}, ${wp.lon.toFixed(2)})` : ''}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="summary-block" style={{ minWidth: 220, flex: 2, background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px #e0e7ef33', padding: 18, border: '1px solid #e5e7eb' }}>
                        <div className="summary-title" style={{ fontWeight: 700, color: '#0ea5e9', fontSize: 15, marginBottom: 8 }}>Weather Summary</div>
                        <div className="summary-text" style={{ fontSize: 15, color: '#13303a' }}>
                          { result.summary ?? result.data?.summary ?? result.hf_summary ?? "No summary available" }
                        </div>
                        { result.hf_summary && <blockquote style={{ color: "#b45309", marginTop: 8, fontStyle: 'italic' }}>{result.hf_summary}</blockquote> }
                        <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ fontWeight: 600 }}>Overall Severity:</div>
                          {result.category === "Clear" && <div className="category-badge badge-clear"><span className="badge-dot" /> <span className="badge-text">Clear</span></div>}
                          {result.category === "Significant" && <div className="category-badge badge-significant"><span className="badge-dot" /> <span className="badge-text">Significant</span></div>}
                          {result.category === "Severe" && <div className="category-badge badge-severe"><span className="badge-dot" /> <span className="badge-text">Severe</span></div>}
                          {!result.category && <div className="category-badge" style={{ background: "#f3f4f6", color: "#0f172a"}}><span className="badge-dot" style={{ background: "#94a3b8" }} /> Unknown</div>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cloud Conditions */}
                  <div className="aviation-section" style={{ marginBottom: 20 }}>
                    <div className="aviation-section-header" style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 8, 
                      marginBottom: 12, 
                      paddingBottom: 8, 
                      borderBottom: '2px solid #e5e7eb' 
                    }}>
                      <span style={{ fontSize: 20 }}>☁️</span>
                      <h4 style={{ margin: 0, color: 'var(--accent-600)' }}>Cloud Conditions</h4>
                    </div>
                    
                    <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8 }}>
                      {clouds.length === 0 ? (
                        <div className="muted" style={{ textAlign: 'center', padding: '20px 0' }}>
                          <div style={{ fontSize: 32, marginBottom: 8 }}>☀️</div>
                          <div>No significant clouds reported</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Clear skies or minimal cloud coverage</div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: 12, color: 'var(--accent-600)' }}>Cloud Layers:</div>
                          <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {clouds.map((cloud, i) => (
                              <li key={i} style={{ marginBottom: 8, fontSize: 14 }}>
                                <span style={{ fontWeight: 600 }}>{cloud}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Departure Airport Section */}
                  <div className="aviation-section" style={{ marginBottom: 20 }}>
                    <div className="aviation-section-header" style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 8, 
                      marginBottom: 12, 
                      paddingBottom: 8, 
                      borderBottom: '2px solid #e5e7eb' 
                    }}>
                      <span style={{ fontSize: 20 }}>🛫</span>
                      <h4 style={{ margin: 0, color: 'var(--accent-600)' }}>Departure Airport</h4>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, fontSize: 12 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input type="radio" name="depReport" value="metar" checked={depReport === "metar"} onChange={() => setDepReport("metar")} />
                          METAR
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input type="radio" name="depReport" value="taf" checked={depReport === "taf"} onChange={() => setDepReport("taf")} />
                          TAF
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input type="radio" name="depReport" value="notams" checked={depReport === "notams"} onChange={() => setDepReport("notams")} />
                          NOTAMs
                        </label>
                      </div>
                    </div>
                    
                    <div className="aviation-summary-blocks" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                      <div className="aviation-summary-block" style={{ padding: 16, background: '#f7fbfc', borderRadius: 12, border: '1px solid #e6eef6' }}>
                        <div className="aviation-summary-title" style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--color-clear)' }}>
                          📍 Airport Information
                        </div>
                        <div className="aviation-summary-text" style={{ fontSize: 14, color: '#13303a' }}>
                          <div><strong>ICAO:</strong> {result?.origin?.icao || result?.route?.origin?.icao || station}</div>
                          <div style={{ marginTop: 4 }}><strong>Location:</strong> {result?.route?.origin?.name || "Airport details"}</div>
                          {result?.route?.origin?.lat && (
                            <div style={{ marginTop: 4 }}>
                              <strong>Coordinates:</strong> {result.route.origin.lat.toFixed(4)}°N, {Math.abs(result.route.origin.lon).toFixed(4)}°W
                            </div>
                          )}
                        </div>
                      </div>

                      {depReport === "metar" && result?.origin?.metar && (
                        <div className="aviation-summary-block" style={{ padding: 16, background: '#f7fbfc', borderRadius: 12, border: '1px solid #e6eef6' }}>
                          <div className="aviation-summary-title" style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--color-clear)' }}>
                            🌤️ Current Weather (METAR)
                          </div>
                          {(() => {
                            const metarData = parseMetar(result.origin.metar);
                            return (
                              <div className="aviation-summary-text" style={{ fontSize: 14, color: '#13303a' }}>
                                <div><strong>Conditions:</strong> {metarData.parsed?.flightRules || 'Unknown'}</div>
                                {metarData.parsed?.temperature && (
                                  <div style={{ marginTop: 4 }}>
                                    <strong>Temperature:</strong> {metarData.parsed.temperature}/{metarData.parsed.dewpoint}
                                  </div>
                                )}
                                <div style={{ marginTop: 4 }}><strong>Wind:</strong> {metarData.parsed?.wind || 'Unknown'}</div>
                                <div style={{ marginTop: 4 }}><strong>Visibility:</strong> {metarData.parsed?.visibility || 'Unknown'}</div>
                                <div style={{ marginTop: 4 }}><strong>Clouds:</strong> {metarData.parsed?.clouds || 'Unknown'}</div>
                                <div style={{ marginTop: 8, fontSize: 11, color: '#666', background: '#f8f9fa', padding: 8, borderRadius: 4, fontFamily: 'monospace' }}>
                                  {metarData.raw}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {depReport === "taf" && result?.origin?.taf && (
                        <div className="aviation-summary-block" style={{ padding: 16, background: '#f7fbfc', borderRadius: 12, border: '1px solid #e6eef6' }}>
                          <div className="aviation-summary-title" style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--color-significant)' }}>
                            📋 Forecast (TAF)
                          </div>
                          {(() => {
                            const tafData = parseTaf(result.origin.taf);
                            return (
                              <div className="aviation-summary-text" style={{ fontSize: 14, color: '#13303a' }}>
                                <div><strong>Valid Period:</strong> {tafData.parsed?.validPeriod || 'Unknown'}</div>
                                <div style={{ marginTop: 4 }}><strong>Forecast Periods:</strong> {tafData.parsed?.periods?.length || 0}</div>
                                {tafData.parsed?.periods?.slice(0, 2).map((period, idx) => (
                                  <div key={idx} style={{ marginTop: 8, padding: 8, background: '#f0f9ff', borderRadius: 4 }}>
                                    <div><strong>{period.type}:</strong></div>
                                    <div style={{ fontSize: 13, marginTop: 2 }}>Wind: {period.wind}</div>
                                    <div style={{ fontSize: 13 }}>Visibility: {period.visibility}</div>
                                    <div style={{ fontSize: 13 }}>Clouds: {period.clouds}</div>
                                  </div>
                                ))}
                                <div style={{ marginTop: 8, fontSize: 11, color: '#666', background: '#f8f9fa', padding: 8, borderRadius: 4, fontFamily: 'monospace' }}>
                                  {tafData.raw}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {depReport === "notams" && result?.origin?.notams && (
                        <div className="aviation-summary-block" style={{ padding: 16, background: '#f7fbfc', borderRadius: 12, border: '1px solid #e6eef6' }}>
                          <div className="aviation-summary-title" style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#2563eb' }}>
                            📢 NOTAMs
                          </div>
                          {(() => {
                            const notamData = parseNotam(result.origin.notams);
                            return (
                              <div className="aviation-summary-text" style={{ fontSize: 14, color: '#13303a' }}>
                                <div><strong>NOTAM ID:</strong> {notamData.parsed?.id || 'Unknown'}</div>
                                <div style={{ marginTop: 4 }}><strong>Category:</strong> {notamData.parsed?.category || 'Unknown'}</div>
                                <div style={{ marginTop: 4 }}>
                                  <strong>Impact:</strong> 
                                  <span style={{color: notamData.parsed?.severity === 'High' ? '#dc2626' : notamData.parsed?.severity === 'Medium' ? '#ea580c' : '#16a34a'}}>
                                    {notamData.parsed?.severity || 'Unknown'}
                                  </span>
                                </div>
                                <div style={{ marginTop: 4 }}><strong>Details:</strong> {notamData.parsed?.details || 'No details available'}</div>
                                <div style={{ marginTop: 8, fontSize: 11, color: '#666', background: '#f8f9fa', padding: 8, borderRadius: 4, fontFamily: 'monospace' }}>
                                  {notamData.raw}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* En-route Section */}
                  <div className="aviation-section" style={{ marginBottom: 20 }}>
                    <div className="aviation-section-header" style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 8, 
                      marginBottom: 12, 
                      paddingBottom: 8, 
                      borderBottom: '2px solid #e5e7eb' 
                    }}>
                      <span style={{ fontSize: 20 }}>✈️</span>
                      <h4 style={{ margin: 0, color: 'var(--accent-600)' }}>En-route Weather Hazards</h4>
                    </div>
                    
                    <div className="aviation-summary-blocks" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                      {result?.enroute?.sigmets ? (
                        <div className="aviation-summary-block" style={{ padding: 16, background: '#fef2f2', borderRadius: 12, border: '1px solid #fecaca' }}>
                          <div className="aviation-summary-title" style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--color-severe)' }}>
                            ⚠️ SIGMETs
                          </div>
                          {(() => {
                            const items = (result.enroute.sigmets || '')
                              .split(/\r?\n|\s*\|\s*/)
                              .map(s => s.trim())
                              .filter(Boolean);
                            if (items.length === 0) return <div className="aviation-summary-text">No SIGMETs provided</div>;
                            return (
                              <div className="aviation-summary-text" style={{ fontSize: 14, color: '#13303a' }}>
                                <ul style={{ margin: 0, paddingLeft: 18 }}>
                                  {items.map((txt, i) => {
                                    const parsed = parseSigmet(txt);
                                    return (
                                      <li key={i} style={{ marginBottom: 8 }}>
                                        <div>{parsed?.summary || txt}</div>
                                        <div style={{ marginTop: 4, fontSize: 11, color: '#6b7280', background: '#fff', padding: 6, borderRadius: 4, fontFamily: 'monospace' }}>
                                          {parsed?.raw || txt}
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            );
                          })()}
                        </div>
                      ) : null}

                      {result?.enroute?.pireps ? (
                        <div className="aviation-summary-block" style={{ padding: 16, background: '#faf5ff', borderRadius: 12, border: '1px solid #e9d5ff' }}>
                          <div className="aviation-summary-title" style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#7c3aed' }}>
                            👨‍✈️ PIREPs
                          </div>
                          {(() => {
                            const items = (result.enroute.pireps || '')
                              .split(/\r?\n|\s*\|\s*/)
                              .map(s => s.trim())
                              .filter(Boolean);
                            if (items.length === 0) return <div className="aviation-summary-text">No PIREPs provided</div>;
                            return (
                              <div className="aviation-summary-text" style={{ fontSize: 14, color: '#13303a' }}>
                                <ul style={{ margin: 0, paddingLeft: 18 }}>
                                  {items.map((txt, i) => {
                                    const parsed = parsePirep(txt);
                                    return (
                                      <li key={i} style={{ marginBottom: 8 }}>
                                        <div>{parsed?.summary || txt}</div>
                                        <div style={{ marginTop: 4, fontSize: 11, color: '#6b7280', background: '#fff', padding: 6, borderRadius: 4, fontFamily: 'monospace' }}>
                                          {parsed?.raw || txt}
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            );
                          })()}
                        </div>
                      ) : null}

                      {!result?.enroute?.sigmets && !result?.enroute?.pireps && (
                        <div className="aviation-summary-block" style={{ padding: 16, background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0' }}>
                          <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                            <div style={{ color: '#16a34a', fontWeight: 600 }}>No En-route Hazards Reported</div>
                            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Clear conditions along flight path</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arrival Airport Section */}
                  <div className="aviation-section" style={{ marginBottom: 20 }}>
                    <div className="aviation-section-header" style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 8, 
                      marginBottom: 12, 
                      paddingBottom: 8, 
                      borderBottom: '2px solid #e5e7eb' 
                    }}>
                      <span style={{ fontSize: 20 }}>🛬</span>
                      <h4 style={{ margin: 0, color: 'var(--accent-600)' }}>Arrival Airport</h4>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, fontSize: 12 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input type="radio" name="arrReport" value="metar" checked={arrReport === "metar"} onChange={() => setArrReport("metar")} />
                          METAR
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input type="radio" name="arrReport" value="taf" checked={arrReport === "taf"} onChange={() => setArrReport("taf")} />
                          TAF
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input type="radio" name="arrReport" value="notams" checked={arrReport === "notams"} onChange={() => setArrReport("notams")} />
                          NOTAMs
                        </label>
                      </div>
                    </div>
                    
                    <div className="aviation-summary-blocks" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                      <div className="aviation-summary-block" style={{ padding: 16, background: '#f7fbfc', borderRadius: 12, border: '1px solid #e6eef6' }}>
                        <div className="aviation-summary-title" style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--color-clear)' }}>
                          📍 Airport Information
                        </div>
                        <div className="aviation-summary-text" style={{ fontSize: 14, color: '#13303a' }}>
                          <div><strong>ICAO:</strong> {result?.destination?.icao || result?.route?.destination?.icao || "Not specified"}</div>
                          <div style={{ marginTop: 4 }}><strong>Location:</strong> {result?.route?.destination?.name || "Airport details"}</div>
                          {result?.route?.destination?.lat && (
                            <div style={{ marginTop: 4 }}>
                              <strong>Coordinates:</strong> {result.route.destination.lat.toFixed(4)}°N, {Math.abs(result.route.destination.lon).toFixed(4)}°W
                            </div>
                          )}
                        </div>
                      </div>

                      {arrReport === "metar" && result?.destination?.metar && (
                        <div className="aviation-summary-block" style={{ padding: 16, background: '#f7fbfc', borderRadius: 12, border: '1px solid #e6eef6' }}>
                          <div className="aviation-summary-title" style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--color-clear)' }}>
                            🌤️ Current Weather (METAR)
                          </div>
                          {(() => {
                            const metarData = parseMetar(result.destination.metar);
                            return (
                              <div className="aviation-summary-text" style={{ fontSize: 14, color: '#13303a' }}>
                                <div><strong>Conditions:</strong> {metarData.parsed?.flightRules || 'Unknown'}</div>
                                {metarData.parsed?.temperature && (
                                  <div style={{ marginTop: 4 }}>
                                    <strong>Temperature:</strong> {metarData.parsed.temperature}/{metarData.parsed.dewpoint}
                                  </div>
                                )}
                                <div style={{ marginTop: 4 }}><strong>Wind:</strong> {metarData.parsed?.wind || 'Unknown'}</div>
                                <div style={{ marginTop: 4 }}><strong>Visibility:</strong> {metarData.parsed?.visibility || 'Unknown'}</div>
                                <div style={{ marginTop: 4 }}><strong>Clouds:</strong> {metarData.parsed?.clouds || 'Unknown'}</div>
                                <div style={{ marginTop: 8, fontSize: 11, color: '#666', background: '#f8f9fa', padding: 8, borderRadius: 4, fontFamily: 'monospace' }}>
                                  {metarData.raw}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                      {arrReport === "taf" && result?.destination?.taf && (
                        <div className="aviation-summary-block" style={{ padding: 16, background: '#f7fbfc', borderRadius: 12, border: '1px solid #e6eef6' }}>
                          <div className="aviation-summary-title" style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--color-significant)' }}>
                            📋 Forecast (TAF)
                          </div>
                          {(() => {
                            const tafData = parseTaf(result.destination.taf);
                            return (
                              <div className="aviation-summary-text" style={{ fontSize: 14, color: '#13303a' }}>
                                <div><strong>Valid Period:</strong> {tafData.parsed?.validPeriod || 'Unknown'}</div>
                                <div style={{ marginTop: 4 }}><strong>Forecast Periods:</strong> {tafData.parsed?.periods?.length || 0}</div>
                                {tafData.parsed?.periods?.slice(0, 2).map((period, idx) => (
                                  <div key={idx} style={{ marginTop: 8, padding: 8, background: '#f0f9ff', borderRadius: 4 }}>
                                    <div><strong>{period.type}:</strong></div>
                                    <div style={{ fontSize: 13, marginTop: 2 }}>Wind: {period.wind}</div>
                                    <div style={{ fontSize: 13 }}>Visibility: {period.visibility}</div>
                                    <div style={{ fontSize: 13 }}>Clouds: {period.clouds}</div>
                                  </div>
                                ))}
                                <div style={{ marginTop: 8, fontSize: 11, color: '#666', background: '#f8f9fa', padding: 8, borderRadius: 4, fontFamily: 'monospace' }}>
                                  {tafData.raw}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {arrReport === "notams" && result?.destination?.notams && (
                        <div className="aviation-summary-block" style={{ padding: 16, background: '#f7fbfc', borderRadius: 12, border: '1px solid #e6eef6' }}>
                          <div className="aviation-summary-title" style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#2563eb' }}>
                            📢 NOTAMs
                          </div>
                          {(() => {
                            const notamData = parseNotam(result.destination.notams);
                            return (
                              <div className="aviation-summary-text" style={{ fontSize: 14, color: '#13303a' }}>
                                <div><strong>NOTAM ID:</strong> {notamData.parsed?.id || 'Unknown'}</div>
                                <div style={{ marginTop: 4 }}><strong>Category:</strong> {notamData.parsed?.category || 'Unknown'}</div>
                                <div style={{ marginTop: 4 }}>
                                  <strong>Impact:</strong> 
                                  <span style={{color: notamData.parsed?.severity === 'High' ? '#dc2626' : notamData.parsed?.severity === 'Medium' ? '#ea580c' : '#16a34a'}}>
                                    {notamData.parsed?.severity || 'Unknown'}
                                  </span>
                                </div>
                                <div style={{ marginTop: 4 }}><strong>Details:</strong> {notamData.parsed?.details || 'No details available'}</div>
                                <div style={{ marginTop: 8, fontSize: 11, color: '#666', background: '#f8f9fa', padding: 8, borderRadius: 4, fontFamily: 'monospace' }}>
                                  {notamData.raw}
                                </div>
                              </div>
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
                  waypoints={ result?.waypoints || [] }
                  severity={ result?.category || null }
                  weatherData={ result?.weatherData || null }
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
