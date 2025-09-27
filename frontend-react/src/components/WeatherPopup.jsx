import React from "react";

export default function WeatherPopup({ weatherData, position, onClose }) {
  if (!weatherData) return null;

  const { metar, taf, decoded, severity } = weatherData;

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'low': return '#22c55e'; // green
      case 'medium': return '#f59e0b'; // amber
      case 'high': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  const formatWindInfo = (decoded) => {
    if (!decoded?.wind) return 'Wind: N/A';
    
    const { direction, speed, gusts } = decoded.wind;
    let windText = `Wind: ${direction}° at ${speed}kt`;
    if (gusts) windText += ` gusting to ${gusts}kt`;
    
    return windText;
  };

  const formatVisibility = (decoded) => {
    if (!decoded?.visibility) return 'Visibility: N/A';
    
    const vis = decoded.visibility;
    if (typeof vis === 'number') {
      return `Visibility: ${vis} SM`;
    } else if (vis.distance) {
      return `Visibility: ${vis.distance} ${vis.unit || 'SM'}`;
    }
    
    return `Visibility: ${vis}`;
  };

  const formatClouds = (decoded) => {
    if (!decoded?.clouds || decoded.clouds.length === 0) return 'Sky: Clear';
    
    const cloudLayers = decoded.clouds.map(cloud => {
      const coverage = cloud.coverage || cloud.type;
      const altitude = cloud.altitude || cloud.base;
      return `${coverage} ${altitude}ft`;
    }).join(', ');
    
    return `Clouds: ${cloudLayers}`;
  };

  const formatTemperature = (decoded) => {
    if (!decoded?.temperature) return 'Temp: N/A';
    
    const temp = decoded.temperature;
    const dew = decoded.dewpoint;
    
    let tempText = `Temperature: ${temp}°C`;
    if (dew !== undefined) tempText += ` / Dewpoint: ${dew}°C`;
    
    return tempText;
  };

  return (
    <div 
      className="weather-popup"
      style={{
        position: 'absolute',
        left: position?.x || 0,
        top: position?.y || 0,
        background: 'white',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
        minWidth: '320px',
        maxWidth: '400px',
        zIndex: 1000
      }}
    >
      <div className="weather-popup-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
            Weather Information
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0 4px'
            }}
          >
            ×
          </button>
        </div>
        
        {severity && (
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: getSeverityColor(severity),
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
              marginBottom: '12px'
            }}
          >
            Severity: {severity.toUpperCase()}
          </div>
        )}
      </div>

      <div className="weather-popup-content">

        {metar && (
          <div style={{ marginBottom: '12px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              Raw METAR
            </h4>
            <div 
              style={{
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#6b7280',
                backgroundColor: '#f9fafb',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #e5e7eb',
                wordBreak: 'break-all'
              }}
            >
              {metar}
            </div>
          </div>
        )}

        {taf && (
          <div style={{ marginBottom: '12px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              Raw TAF
            </h4>
            <div 
              style={{
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#6b7280',
                backgroundColor: '#f9fafb',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #e5e7eb',
                maxHeight: '80px',
                overflow: 'auto',
                wordBreak: 'break-all'
              }}
            >
              {taf}
            </div>
          </div>
        )}

        {weatherData.humanReadable && (
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              Plain English
            </h4>
            <div style={{ fontSize: '13px', lineHeight: '1.4', color: '#4b5563' }}>
              {weatherData.humanReadable}
            </div>
          </div>
        )}
      </div>

      {weatherData.warnings && weatherData.warnings.length > 0 && (
        <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#fef3c7', borderRadius: '4px', border: '1px solid #f59e0b' }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '600', color: '#92400e' }}>
            Warnings
          </h4>
          {weatherData.warnings.map((warning, index) => (
            <div key={index} style={{ fontSize: '12px', color: '#92400e', marginBottom: '2px' }}>
              • {warning}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}