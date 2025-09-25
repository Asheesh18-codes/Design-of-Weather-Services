// src/components/MapView.jsx
import React, { useMemo, useEffect } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

/* --- Helpers --- */
// normalize incoming point objects to { lon: number, lat: number, icao?, label? }
function normalizePoint(pt) {
  if (!pt) return null;
  const lon = pt.lon !== undefined ? Number(pt.lon) : (pt.lng !== undefined ? Number(pt.lng) : null);
  const lat = pt.lat !== undefined ? Number(pt.lat) : (pt.latitude !== undefined ? Number(pt.latitude) : null);
  if (Number.isNaN(lon) || Number.isNaN(lat) || lon === null || lat === null) return null;
  return { ...pt, lon, lat };
}


/* --- Inline airplane SVG (stroke + fill) --- */
function AirplaneSVG({ size = 30, color = "#0ea5a4", rotate = 0 }) {
  // rotate applied to wrapper div so we can anchor/translate easily
  return (
    <div style={{
      transform: `rotate(${rotate}deg)`,
      display: "inline-block",
      width: size,
      height: size,
      lineHeight: 0
    }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        <path
          d="M2 16l8-2 4-9 4 9 6 2-10 3v3l-4-1-4 1v-3z"
          fill={color}
          stroke="#fff"
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/* --- MapView Component --- */
export default function MapView({ origin = null, destination = null, sigmetGeojson = null }) {
  const token = import.meta.env.VITE_MAPBOX_KEY || "";
  // Removed unused mapError state

  // normalize coords
  const o = useMemo(() => normalizePoint(origin), [origin]);
  const d = useMemo(() => normalizePoint(destination), [destination]);

  useEffect(() => {
    // debug log to help you see values in console
    console.log("MapView: origin =", o, "destination =", d);
  }, [o, d]);

  // compute map center
  const center = useMemo(() => {
    if (o && d) return [(o.lon + d.lon) / 2, (o.lat + d.lat) / 2];
    if (o) return [o.lon, o.lat];
    if (d) return [d.lon, d.lat];
    return [0, 20];
  }, [o, d]);

  // compute line geojson for route
  const routeGeo = useMemo(() => {
    if (!o || !d) return null;
    return {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [[o.lon, o.lat], [d.lon, d.lat]],
      },
    };
  }, [o, d]);

  // bearing for airplane rotation (0..360 deg, 0 = north)
  // (removed unused 'bearing' variable)

  // Mapbox layer styles
  const routeLayer = {
    id: "route-line",
    type: "line",
    paint: {
      "line-color": "#0ea5a4",
      "line-width": 3,
      "line-opacity": 0.95,
    },
  };

  const sigmetLayer = {
    id: "sigmet-fill",
    type: "fill",
    paint: {
      "fill-color": "#ff0000",
      "fill-opacity": 0.14,
    },
  };

  if (!token) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ textAlign: "center", color: "#b45309" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Mapbox token not set</div>
          <div style={{ fontSize: 13 }}>Add <code>VITE_MAPBOX_KEY=pk.xxxx</code> to <code>.env.local</code> and restart dev server</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <Map
        mapboxAccessToken={token}
        initialViewState={{
          longitude: center[0],
          latitude: center[1],
          zoom: o && d ? 4.6 : (o || d ? 6 : 2.6),
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        onError={(e) => {
          console.error("Mapbox error:", e);
        }}
      >
        {/* Origin marker (airplane) — SVG rotated to face destination */}
        {o && (
          <Marker longitude={o.lon} latitude={o.lat} anchor="center">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: "translateY(-4px)" }}>
              {/* white circular background so the plane stands out on map */}
              <div style={{
                width: 44, height: 44, borderRadius: 999,
                background: "rgba(255,255,255,0.95)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 6px 18px rgba(0,0,0,0.12)"
              }}>
                {/* rotate plane: CSS rotate expects deg clockwise relative to default; bearing is degrees clockwise from north.
                    SVG default points right (east). We want plane to point along bearing (north=0). So rotate by (bearing - 90) */}
                <AirplaneSVG size={28} color="#0ea5a4" rotate={0} />
              </div>

              {/* small label */}
              <div style={{
                marginTop: 6, background: "white", padding: "4px 8px", borderRadius: 8,
                fontSize: 12, boxShadow: "0 6px 14px rgba(0,0,0,0.08)"
              }}>
                {o.icao || o.label || "Origin"}
              </div>
            </div>
          </Marker>
        )}

        {/* Destination marker */}
        {d && (
          <Marker longitude={d.lon} latitude={d.lat} anchor="bottom">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                width: 30, height: 30, borderRadius: 999, background: "#fff", display: "flex",
                alignItems: "center", justifyContent: "center", boxShadow: "0 6px 12px rgba(0,0,0,0.08)"
              }}>
                <div style={{ width: 8, height: 8, borderRadius: 999, background: "#0ea5a4" }} />
              </div>
              <div style={{ marginTop: 6, background: "white", padding: "4px 8px", borderRadius: 8, fontSize: 12, boxShadow: "0 6px 14px rgba(0,0,0,0.06)" }}>
                {d.icao || d.label || "Destination"}
              </div>
            </div>
          </Marker>
        )}

        {/* route line */}
        {routeGeo && (
          <>
            <Source id="route" type="geojson" data={routeGeo} />
            <Layer {...routeLayer} source="route" />
          </>
        )}

        {/* sigmet polygon */}
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
