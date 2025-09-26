import React, { useState } from "react";
import FlightForm from "./components/FlightForm";
import MapView from "./components/MapView";
import { parseWeather } from "./services/api";
import "./styles.css";

/**
 * App: main dashboard.
 * - shows parsed summary + richer detailed weather fields
 * - uses result.data (avwx) or result.parsed (fallback) robustly
 *
 * This version includes:
 * - sampleDemo object
 * - Load Demo button (manual)
 * - optional auto-load (commented) for dev convenience
 */

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
      const res = await parseWeather(payload);
      setResult(res);
    } catch (err) {
      setError(err?.message || "Failed to parse");
    } finally {
      setLoading(false);
    }
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

            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button onClick={() => setResult(sampleDemo)} className="btn btn-ghost">Load Demo</button>
              <button onClick={() => { setResult(null); setError(null); }} className="btn btn-ghost">Clear Demo</button>
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
                  <div className="card">
                    <div className="summary-title">Raw / Full Data</div>
                    <pre className="raw-pre">{JSON.stringify(result, null, 2)}</pre>
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
