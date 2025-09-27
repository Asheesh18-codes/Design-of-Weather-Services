import React, { useMemo, useState, useEffect } from "react";
import Map, { Marker, Source, Layer, Popup } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import WeatherPopup from "./WeatherPopup";
import SigmetOverlay from "./SigmetOverlay";

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

export default function MapView({ 
  origin = null, 
  destination = null, 
  waypoints = [],
  weatherData = null,
  sigmets = [],
  severity = null,
  onWeatherClick,
  onSigmetClick
}) {
  const token = import.meta.env.VITE_MAPBOX_KEY || "";
  const [selectedWeather, setSelectedWeather] = useState(null);
  const [weatherPopupPos, setWeatherPopupPos] = useState(null);

  const o = useMemo(() => norm(origin), [origin]);
  const d = useMemo(() => norm(destination), [destination]);
  
  // Normalize waypoints
  const normalizedWaypoints = useMemo(() => {
    return waypoints?.map(wp => norm(wp)).filter(Boolean) || [];
  }, [waypoints]);

  const center = useMemo(() => {
    if (normalizedWaypoints.length > 0) {
      const lons = normalizedWaypoints.map(wp => wp.lon);
      const lats = normalizedWaypoints.map(wp => wp.lat);
      return [
        (Math.min(...lons) + Math.max(...lons)) / 2,
        (Math.min(...lats) + Math.max(...lats)) / 2
      ];
    }
    if (o && d) return [(o.lon + d.lon) / 2, (o.lat + d.lat) / 2];
    if (o) return [o.lon, o.lat];
    if (d) return [d.lon, d.lat];
    return [-98.5795, 39.8283]; // Center of USA
  }, [o, d, normalizedWaypoints]);

  const bearing = useMemo(() => {
    if (!o || !d) return 0;
    return bearingBetween(o, d);
  }, [o, d]);

  const severityColor = severity === "HIGH" ? "#ef4444" : 
                       severity === "SEVERE" ? "#dc2626" :
                       severity === "MEDIUM" ? "#f59e0b" : 
                       severity === "SIGNIFICANT" ? "#f97316" : "#0ea5a4";

  // Create route geometry from waypoints or origin/destination
  const routeGeo = useMemo(() => {
    if (normalizedWaypoints.length > 1) {
      const coordinates = normalizedWaypoints.map(wp => [wp.lon, wp.lat]);
      return { type: "Feature", geometry: { type: "LineString", coordinates } };
    } else if (o && d) {
      return { type: "Feature", geometry: { type: "LineString", coordinates: [[o.lon, o.lat], [d.lon, d.lat]] } };
    }
    return null;
  }, [o, d, normalizedWaypoints]);

  const routeLayer = {
    id: "route-line",
    type: "line",
    paint: { 
      "line-color": severityColor, 
      "line-width": 4, 
      "line-opacity": 0.8,
      "line-dasharray": [1, 0]
    }
  };

  // SIGMET layers
  const sigmetFillLayer = {
    id: "sigmet-fill",
    type: "fill",
    paint: { 
      "fill-color": ["get", "color"],
      "fill-opacity": 0.15 
    }
  };

  const sigmetStrokeLayer = {
    id: "sigmet-stroke",
    type: "line",
    paint: { 
      "line-color": ["get", "color"],
      "line-width": 2,
      "line-opacity": 0.6 
    }
  };

  // Create SIGMET GeoJSON
  const sigmetGeoJSON = useMemo(() => {
    if (!sigmets || sigmets.length === 0) return null;
    
    const features = sigmets.map((sigmet, index) => {
      const color = getSigmetColor(sigmet.hazard, sigmet.intensity);
      
      return {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [sigmet.coordinates]
        },
        properties: {
          id: sigmet.id || index,
          hazard: sigmet.hazard,
          intensity: sigmet.intensity,
          color: color,
          description: sigmet.description
        }
      };
    });

    return {
      type: "FeatureCollection",
      features
    };
  }, [sigmets]);

  const getSigmetColor = (hazard, intensity) => {
    const colors = {
      'TURBULENCE': { 'LIGHT': '#fbbf24', 'MODERATE': '#f59e0b', 'SEVERE': '#dc2626' },
      'ICING': { 'LIGHT': '#60a5fa', 'MODERATE': '#3b82f6', 'SEVERE': '#1d4ed8' },
      'THUNDERSTORM': { 'ISOLATED': '#a855f7', 'OCCASIONAL': '#9333ea', 'FREQUENT': '#7c3aed' }
    };
    return colors[hazard?.toUpperCase()]?.[intensity?.toUpperCase()] || '#f59e0b';
  };

  const handleWeatherClick = (event, waypoint) => {
    event.originalEvent.stopPropagation();
    
    if (weatherData && waypoint) {
      const weather = weatherData[waypoint.icao] || weatherData[waypoint.name];
      if (weather) {
        setSelectedWeather(weather);
        setWeatherPopupPos({
          x: event.originalEvent.clientX,
          y: event.originalEvent.clientY
        });
        onWeatherClick && onWeatherClick(weather, waypoint);
      }
    }
  };

  const handleSigmetClick = (sigmet) => {
    onSigmetClick && onSigmetClick(sigmet);
  };

  const closeWeatherPopup = () => {
    setSelectedWeather(null);
    setWeatherPopupPos(null);
  };

  if (!token) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ textAlign: "center", color: "#b45309" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Mapbox token not set</div>
          <div style={{ fontSize: 13 }}>Add <code>VITE_MAPBOX_KEY=pk.xxxx</code> to <code>.env</code> and restart dev</div>
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
          zoom: normalizedWaypoints.length > 0 ? 5 : (o && d ? 4.5 : (o || d ? 6 : 4))
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        interactiveLayerIds={['sigmet-fill']}
        onClick={(event) => {
          const features = event.features;
          if (features && features.length > 0) {
            const sigmetFeature = features.find(f => f.layer.id === 'sigmet-fill');
            if (sigmetFeature && onSigmetClick) {
              onSigmetClick(sigmetFeature.properties);
            }
          }
        }}
      >
        {/* Origin Marker */}
        {o && (
          <Marker longitude={o.lon} latitude={o.lat} anchor="center">
            <div 
              style={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                transform: "translateY(-4px)",
                cursor: weatherData?.[o.icao || o.label] ? 'pointer' : 'default'
              }}
              onClick={(e) => handleWeatherClick(e, o)}
            >
              <div style={{
                width: 48, 
                height: 48, 
                borderRadius: '50%', 
                background: "rgba(255,255,255,0.95)",
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                boxShadow: "0 8px 20px rgba(2,6,23,0.08)",
                transform: `rotate(${bearing - 90}deg)`,
                border: weatherData?.[o.icao || o.label] ? '3px solid #3b82f6' : '2px solid #e5e7eb'
              }}>
                <AirplaneSVG size={28} color={severityColor} />
              </div>
              <div style={{ 
                marginTop: 6, 
                background: "white", 
                padding: "4px 8px", 
                borderRadius: 8, 
                boxShadow: "0 6px 14px rgba(0,0,0,0.06)", 
                fontSize: 12,
                fontWeight: '600',
                color: '#374151'
              }}>
                {o.icao || o.label || "Origin"}
              </div>
            </div>
          </Marker>
        )}

        {/* Waypoint Markers */}
        {normalizedWaypoints.slice(1, -1).map((waypoint, index) => (
          <Marker key={index} longitude={waypoint.lon} latitude={waypoint.lat} anchor="center">
            <div 
              style={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center",
                cursor: weatherData?.[waypoint.icao || waypoint.name] ? 'pointer' : 'default'
              }}
              onClick={(e) => handleWeatherClick(e, waypoint)}
            >
              <div style={{
                width: 24, 
                height: 24, 
                borderRadius: '50%', 
                background: "#fff",
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                border: weatherData?.[waypoint.icao || waypoint.name] ? '2px solid #3b82f6' : '1px solid #d1d5db'
              }}>
                <div style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  background: severityColor 
                }} />
              </div>
              <div style={{ 
                marginTop: 4, 
                background: "white", 
                padding: "2px 6px", 
                borderRadius: 6, 
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)", 
                fontSize: 10,
                fontWeight: '500'
              }}>
                {waypoint.name || waypoint.icao || `WP${index + 1}`}
              </div>
            </div>
          </Marker>
        ))}

        {/* Destination Marker */}
        {d && (
          <Marker longitude={d.lon} latitude={d.lat} anchor="bottom">
            <div 
              style={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center",
                cursor: weatherData?.[d.icao || d.label] ? 'pointer' : 'default'
              }}
              onClick={(e) => handleWeatherClick(e, d)}
            >
              <div style={{ 
                width: 32, 
                height: 32, 
                borderRadius: '50%', 
                background: "#fff", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                boxShadow: "0 6px 12px rgba(0,0,0,0.08)",
                border: weatherData?.[d.icao || d.label] ? '3px solid #3b82f6' : '2px solid #e5e7eb'
              }}>
                <div style={{ 
                  width: 12, 
                  height: 12, 
                  borderRadius: '50%', 
                  background: severityColor 
                }} />
              </div>
              <div style={{ 
                marginTop: 6, 
                background: "white", 
                padding: "4px 8px", 
                borderRadius: 8, 
                boxShadow: "0 6px 14px rgba(0,0,0,0.06)", 
                fontSize: 12,
                fontWeight: '600',
                color: '#374151'
              }}>
                {d.icao || d.label || "Destination"}
              </div>
            </div>
          </Marker>
        )}

        {/* Flight Route */}
        {routeGeo && (
          <>
            <Source id="route" type="geojson" data={routeGeo}>
              <Layer {...routeLayer} />
            </Source>
          </>
        )}

        {/* SIGMET Overlay */}
        {sigmetGeoJSON && (
          <Source id="sigmets" type="geojson" data={sigmetGeoJSON}>
            <Layer {...sigmetFillLayer} />
            <Layer {...sigmetStrokeLayer} />
          </Source>
        )}
      </Map>

      {/* Weather Popup */}
      {selectedWeather && weatherPopupPos && (
        <WeatherPopup 
          weatherData={selectedWeather}
          position={weatherPopupPos}
          onClose={closeWeatherPopup}
        />
      )}

      {/* SIGMET Overlay Component */}
      {sigmets && sigmets.length > 0 && (
        <SigmetOverlay 
          sigmets={sigmets}
          onSigmetClick={handleSigmetClick}
        />
      )}
    </div>
  );
}
