import React, { useState } from "react";
import FlightForm from "./components/FlightForm";
import MapView from "./components/MapView";
import "./styles.css"; // <- import the CSS file

export default function App(){
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleResult = (p) => { setError(null); setResult(p); }
  const handleError = (m) => { setError(m); }

  const clear = () => { setResult(null); setError(null); }

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
      </header>

      <main className="grid">
        <aside>
          <div className="card card-hero">
            <h3 style={{marginTop:0}}>Pilot Input</h3>
            <FlightForm onResult={handleResult} onError={handleError} />
          </div>

          <div style={{height:12}} />

          <div className="card">
            <h4 style={{marginTop:0}}>Quick tips</h4>
            <ul style={{color:"var(--muted)", fontSize:13, marginTop:8}}>
              <li>Enter ICAO codes (e.g. KJFK, KSFO) or paste a coded report.</li>
            </ul>
          </div>
        </aside>

        <section>
          <div className="card">
            <div className="space-between">
              <div>
                <h3 style={{margin:0}}>Parsed Summary</h3>
                <div className="muted" style={{marginTop:6, fontSize:13}}>Human-friendly decoded weather products</div>
              </div>
              <div className="muted">
                { result ? (result.product || "METAR") : null }
                <button onClick={clear} className="btn btn-ghost" style={{marginLeft:12}}>Clear</button>
              </div>
            </div>

            <div style={{marginTop:14}}>
              { !result && !error && <div className="muted">No briefing yet — submit the form.</div> }
              { error && <div style={{color:"#c53030", marginBottom:8}}>{error}</div> }

              { result && (
                <div className="summary-grid" style={{marginTop:12}}>
                  <div className="summary-block">
                    <div className="summary-title">Overview</div>
                    <div className="summary-text">{result.summary || "-"}</div>
                    { result.hf_summary && <blockquote style={{color:"#b45309", marginTop:8}}>{result.hf_summary}</blockquote> }
                    <div style={{marginTop:10, fontSize:12, color:"var(--muted)"}}>Category: <span style={{fontWeight:700, marginLeft:6}}>{result.category}</span></div>
                  </div>

                  <div className="summary-block">
                    <div className="summary-title">Station / Route</div>
                    <div className="summary-text">
                      <div className="kv">Station: <span className="val">{result.parsed?.station || "-"}</span></div>
                      <div className="kv" style={{marginTop:6}}>Time: <span className="val">{result.parsed?.time || "-"}</span></div>
                      <div className="kv" style={{marginTop:6}}>Wind: <span className="val">{result.parsed?.wind || "-"}</span></div>
                    </div>
                  </div>

                  <div className="summary-block">
                    <div className="summary-title">Raw / Details</div>
                    <pre className="raw-pre">{JSON.stringify(result, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{height:18}} />

          <div className="card">
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
              <h3 style={{margin:0}}>Map: Origin → Destination</h3>
              <div className="muted">Interactive map — zoom & pan</div>
            </div>

            <div className="map-wrapper">
              { result ? (
                <MapView
                  origin={ result?.route?.origin || (result?.parsed && { icao: result.parsed.station, lat: result.parsed.lat, lon: result.parsed.lon }) }
                  destination={ result?.route?.destination || null }
                  sigmetGeojson={ result?.sigmet_geojson || null }
                />
              ) : (
                <div className="map-fallback">Map will show route after parsing</div>
              ) }
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
