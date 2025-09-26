import React, { useMemo } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

function norm(pt) {
  if (!pt) return null;
  const lon = pt.lon !== undefined ? Number(pt.lon) : (pt.lng !== undefined ? Number(pt.lng) : null);
  const lat = pt.lat !== undefined ? Number(pt.lat) : (pt.lat !== undefined ? Number(pt.lat) : null);
  if (Number.isNaN(lon) || Number.isNaN(lat) || lon === null || lat === null) return null;
  return { ...pt, lon, lat };
}

function bearingBetween(o, d) {
  if (!o || !d) return 0;
  const φ1 = (o.lat * Math.PI) / 180;
  const φ2 = (d.lat * Math.PI) / 180;
  const λ1 = (o.lon * Math.PI) / 180;
  const λ2 = (d.lon * Math.PI) / 180;
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  let θ = Math.atan2(y, x);
  θ = (θ * 180) / Math.PI;
  θ = (θ + 360) % 360;
  return θ;
}

function AirplaneSVG({ size = 28, color = "#0ea5a4" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: "block" }} xmlns="http://www.w3.org/2000/svg">
      <path d="M2 16l8-2 4-9 4 9 6 2-10 3v3l-4-1-4 1v-3z" fill={color} stroke="#fff" strokeWidth="0.6" strokeLinejoin="round" />
    </svg>
  );
}

export default function MapView({ origin = null, destination = null, sigmetGeojson = null, severity = null }) {
  const token = import.meta.env.VITE_MAPBOX_KEY || "";

  const o = useMemo(() => norm(origin), [origin]);
  const d = useMemo(() => norm(destination), [destination]);

  const center = useMemo(() => {
    if (o && d) return [(o.lon + d.lon) / 2, (o.lat + d.lat) / 2];
    if (o) return [o.lon, o.lat];
    if (d) return [d.lon, d.lat];
    return [0, 20];
  }, [o, d]);

  const routeGeo = useMemo(() => {
    if (!o || !d) return null;
    return { type: "Feature", geometry: { type: "LineString", coordinates: [[o.lon, o.lat], [d.lon, d.lat]] } };
  }, [o, d]);

  const bearing = useMemo(() => {
    if (!o || !d) return 0;
    return bearingBetween(o, d);
  }, [o, d]);

  const severityColor = severity === "Severe" ? "#ef4444" : severity === "Significant" ? "#f59e0b" : "#0ea5a4";

  const routeLayer = {
    id: "route-line",
    type: "line",
    paint: { "line-color": severityColor, "line-width": 3, "line-opacity": 0.95 }
  };

  const sigmetLayer = {
    id: "sigmet-fill",
    type: "fill",
    paint: { "fill-color": "#ff0000", "fill-opacity": 0.12 }
  };

  if (!token) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ textAlign: "center", color: "#b45309" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Mapbox token not set</div>
          <div style={{ fontSize: 13 }}>Add <code>VITE_MAPBOX_KEY=pk.xxxx</code> to <code>.env.local</code> and restart dev</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Map
        mapboxAccessToken={token}
        initialViewState={{ longitude: center[0], latitude: center[1], zoom: o && d ? 4.5 : (o || d ? 6 : 2.6) }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v11"
      >
        {o && (
          <Marker longitude={o.lon} latitude={o.lat} anchor="center">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: "translateY(-4px)" }}>
              <div style={{
                width: 48, height: 48, borderRadius: 999, background: "rgba(255,255,255,0.95)",
                display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(2,6,23,0.08)",
                transform: `rotate(${bearing - 90}deg)`
              }}>
                <AirplaneSVG size={28} color={severityColor} />
              </div>
              <div style={{ marginTop: 6, background: "white", padding: "4px 8px", borderRadius: 8, boxShadow: "0 6px 14px rgba(0,0,0,0.06)", fontSize: 12 }}>
                {o.icao || o.label || "Origin"}
              </div>
            </div>
          </Marker>
        )}

        {d && (
          <Marker longitude={d.lon} latitude={d.lat} anchor="bottom">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 30, height: 30, borderRadius: 999, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 12px rgba(0,0,0,0.08)" }}>
                <div style={{ width: 8, height: 8, borderRadius: 999, background: severityColor }} />
              </div>
              <div style={{ marginTop: 6, background: "white", padding: "4px 8px", borderRadius: 8, boxShadow: "0 6px 14px rgba(0,0,0,0.06)", fontSize: 12 }}>
                {d.icao || d.label || "Destination"}
              </div>
            </div>
          </Marker>
        )}

        {routeGeo && (
          <>
            <Source id="route" type="geojson" data={routeGeo} />
            <Layer {...routeLayer} source="route" />
          </>
        )}

        {sigmetGeojson && (
          <>
            <Source id="sigmet" type="geojson" data={sigmetGeojson} />
            <Layer {...sigmetLayer} source="sigmet" />
          </>
        )}
      </Map>
    </div>
  );
}
