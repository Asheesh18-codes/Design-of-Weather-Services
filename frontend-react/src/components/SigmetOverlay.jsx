import React from "react";

export default function SigmetOverlay({ sigmets, onSigmetClick }) {
  if (!sigmets || sigmets.length === 0) return null;

  const getSigmetColor = (hazard, intensity) => {
    const colors = {
      'TURBULENCE': {
        'LIGHT': '#fbbf24',
        'MODERATE': '#f59e0b', 
        'SEVERE': '#dc2626',
        'EXTREME': '#991b1b'
      },
      'ICING': {
        'LIGHT': '#60a5fa',
        'MODERATE': '#3b82f6',
        'SEVERE': '#1d4ed8',
        'EXTREME': '#1e3a8a'
      },
      'THUNDERSTORM': {
        'ISOLATED': '#a855f7',
        'OCCASIONAL': '#9333ea',
        'FREQUENT': '#7c3aed',
        'EMBEDDED': '#6d28d9'
      },
      'DUST_STORM': {
        'LOW': '#d97706',
        'MODERATE': '#b45309',
        'HIGH': '#92400e'
      },
      'VOLCANIC_ASH': {
        'LOW': '#6b7280',
        'MODERATE': '#4b5563',
        'HIGH': '#374151'
      }
    };

    const hazardColors = colors[hazard?.toUpperCase()] || colors.TURBULENCE;
    return hazardColors[intensity?.toUpperCase()] || hazardColors.MODERATE || '#f59e0b';
  };

  const getSigmetOpacity = (intensity) => {
    switch (intensity?.toUpperCase()) {
      case 'LIGHT': return 0.3;
      case 'MODERATE': return 0.4;
      case 'SEVERE': return 0.5;
      case 'EXTREME': return 0.6;
      default: return 0.4;
    }
  };

  const formatSigmetInfo = (sigmet) => {
    const parts = [];
    
    if (sigmet.hazard) parts.push(sigmet.hazard.replace(/_/g, ' '));
    if (sigmet.intensity) parts.push(sigmet.intensity);
    if (sigmet.altitude) {
      parts.push(`FL${Math.floor(sigmet.altitude.bottom / 100)}-${Math.floor(sigmet.altitude.top / 100)}`);
    }
    if (sigmet.movement) {
      parts.push(`Moving ${sigmet.movement.direction} at ${sigmet.movement.speed}kt`);
    }
    
    return parts.join(' • ');
  };

  const createSigmetPath = (coordinates) => {
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) return '';
    
    // Handle different coordinate formats
    let coords;
    if (coordinates[0] && Array.isArray(coordinates[0])) {
      // Array of coordinate pairs [[lat, lng], [lat, lng], ...]
      coords = coordinates;
    } else if (coordinates.length >= 6 && coordinates.length % 2 === 0) {
      // Flat array [lat, lng, lat, lng, ...]
      coords = [];
      for (let i = 0; i < coordinates.length; i += 2) {
        coords.push([coordinates[i], coordinates[i + 1]]);
      }
    } else {
      return '';
    }
    
    // Create SVG path
    const pathCommands = coords.map((coord, index) => {
      const [lat, lng] = coord;
      return `${index === 0 ? 'M' : 'L'} ${lng} ${lat}`;
    }).join(' ');
    
    return pathCommands + ' Z'; // Close the path
  };

  return (
    <div className="sigmet-overlay">
      {sigmets.map((sigmet, index) => {
        const color = getSigmetColor(sigmet.hazard, sigmet.intensity);
        const opacity = getSigmetOpacity(sigmet.intensity);
        const info = formatSigmetInfo(sigmet);

        return (
          <div key={sigmet.id || index} className="sigmet-item">
            {/* SVG Polygon for the hazard area */}
            {sigmet.coordinates && (
              <svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 100
                }}
              >
                <polygon
                  points={sigmet.coordinates.map(coord => `${coord[1]},${coord[0]}`).join(' ')}
                  fill={color}
                  fillOpacity={opacity}
                  stroke={color}
                  strokeWidth="2"
                  strokeOpacity={0.8}
                  style={{ cursor: 'pointer', pointerEvents: 'all' }}
                  onClick={() => onSigmetClick && onSigmetClick(sigmet)}
                />
              </svg>
            )}

            {/* SIGMET Info Label */}
            {sigmet.labelPosition && (
              <div
                style={{
                  position: 'absolute',
                  left: sigmet.labelPosition.x,
                  top: sigmet.labelPosition.y,
                  backgroundColor: color,
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  zIndex: 200,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
                onClick={() => onSigmetClick && onSigmetClick(sigmet)}
              >
                {sigmet.hazard?.replace(/_/g, ' ') || 'SIGMET'}
                {sigmet.intensity && ` (${sigmet.intensity})`}
              </div>
            )}
          </div>
        );
      })}

      {/* SIGMET Legend */}
      <div 
        className="sigmet-legend"
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          backgroundColor: 'white',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          padding: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 300,
          minWidth: '200px'
        }}
      >
        <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
          SIGMET Hazards
        </h4>
        <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
          {sigmets.reduce((unique, sigmet) => {
            const key = `${sigmet.hazard}-${sigmet.intensity}`;
            if (!unique.find(item => item.key === key)) {
              unique.push({
                key,
                hazard: sigmet.hazard,
                intensity: sigmet.intensity,
                color: getSigmetColor(sigmet.hazard, sigmet.intensity)
              });
            }
            return unique;
          }, []).map(item => (
            <div key={item.key} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: item.color,
                  marginRight: '6px',
                  borderRadius: '2px'
                }}
              />
              <span style={{ color: '#4b5563' }}>
                {item.hazard?.replace(/_/g, ' ')} {item.intensity && `(${item.intensity})`}
              </span>
            </div>
          ))}
        </div>
        
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb', fontSize: '10px', color: '#6b7280' }}>
          Click on hazard areas for details
        </div>
      </div>
    </div>
  );
}