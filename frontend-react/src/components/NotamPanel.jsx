import React, { useState, useEffect } from "react";
import { notamAPI } from "../services/api";
import nlpAPI from "../services/nlpApi";

export default function NotamPanel({ 
  icao, 
  notams, 
  onNotamSelect, 
  onSummaryGenerated,
  weatherData 
}) {
  const [selectedNotam, setSelectedNotam] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedNotams, setExpandedNotams] = useState(new Set());
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  // Auto-generate summary when NOTAMs or weather data changes
  useEffect(() => {
    if ((notams && notams.length > 0) || weatherData) {
      generateSummary();
    }
  }, [notams, weatherData]);

  const generateSummary = async () => {
    if (!notams || notams.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // Combine all NOTAM text
      const notamText = notams
        .map(notam => notam.text || notam.description || '')
        .filter(text => text.length > 0)
        .join(' | ');

      // Call summarization API
      const response = await notamAPI.summarizeData({
        notamText,
        weatherData,
        icao
      });

      if (response.success) {
        setSummary(response);
        onSummaryGenerated && onSummaryGenerated(response);
      } else {
        setError('Failed to generate summary');
      }
    } catch (err) {
      console.error('Summary generation failed:', err);
      setError('Summary generation failed');
    } finally {
      setLoading(false);
    }
  };

  const parseNotam = async (notam) => {
    if (!notam.text && !notam.description) return;

    setLoading(true);
    try {
      const response = await notamAPI.parseNotam({
        notamText: notam.text || notam.description,
        icao: notam.icao || icao
      });

      if (response.success) {
        // Update the notam with parsed data
        const updatedNotam = {
          ...notam,
          parsed: response.parsed,
          parsedAt: new Date().toISOString()
        };
        
        setSelectedNotam(updatedNotam);
        onNotamSelect && onNotamSelect(updatedNotam);
      }
    } catch (err) {
      console.error('NOTAM parsing failed:', err);
      setError('Failed to parse NOTAM');
    } finally {
      setLoading(false);
    }
  };

  const toggleNotamExpansion = (notamId) => {
    const newExpanded = new Set(expandedNotams);
    if (newExpanded.has(notamId)) {
      newExpanded.delete(notamId);
    } else {
      newExpanded.add(notamId);
    }
    setExpandedNotams(newExpanded);
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'low': return '#22c55e';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'RUNWAY': '🛬',
      'TAXIWAY': '🛫',
      'NAVIGATION': '📡',
      'AIRSPACE': '🌐',
      'CONSTRUCTION': '🚧',
      'LIGHTING': '💡',
      'GENERAL': '📋'
    };
    return icons[category?.toUpperCase()] || '📋';
  };

  const filteredNotams = notams?.filter(notam => {
    if (filterCategory !== 'ALL' && notam.category !== filterCategory) return false;
    if (filterSeverity !== 'ALL' && notam.severity !== filterSeverity) return false;
    return true;
  }) || [];

  const categories = [...new Set((notams || []).map(n => n.category).filter(Boolean))];
  const severities = [...new Set((notams || []).map(n => n.severity).filter(Boolean))];

  return (
    <div className="notam-panel" style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      {/* Panel Header */}
      <div style={{ 
        padding: '16px', 
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
            NOTAMs {icao && `for ${icao}`}
          </h3>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            {filteredNotams.length} of {notams?.length || 0}
          </div>
        </div>

        {/* Filters */}
        {(categories.length > 0 || severities.length > 0) && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {categories.length > 1 && (
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: 'white'
                }}
              >
                <option value="ALL">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}

            {severities.length > 1 && (
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: 'white'
                }}
              >
                <option value="ALL">All Severities</option>
                {severities.map(sev => (
                  <option key={sev} value={sev}>{sev}</option>
                ))}
              </select>
            )}

            <button
              onClick={generateSummary}
              disabled={loading}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {loading ? 'Generating...' : 'Refresh Summary'}
            </button>
          </div>
        )}
      </div>

      {/* Summary Section */}
      {summary && (
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#eff6ff',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#1e40af' }}>
            AI-Generated Summary
          </h4>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', lineHeight: '1.4', color: '#374151' }}>
            {summary.summary}
          </p>
          
          {summary.keyPoints && summary.keyPoints.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#1e40af', marginBottom: '4px' }}>
                Key Points:
              </div>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#4b5563' }}>
                {summary.keyPoints.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {summary.recommendations && summary.recommendations.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#1e40af', marginBottom: '4px' }}>
                Recommendations:
              </div>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#4b5563' }}>
                {summary.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{ 
          padding: '12px 16px', 
          backgroundColor: '#fef2f2', 
          borderBottom: '1px solid #fecaca',
          color: '#dc2626',
          fontSize: '13px'
        }}>
          {error}
        </div>
      )}

      {/* NOTAMs List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        {filteredNotams.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '32px 16px',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            {notams?.length === 0 ? 'No NOTAMs available' : 'No NOTAMs match current filters'}
          </div>
        ) : (
          filteredNotams.map((notam, index) => {
            const notamId = notam.id || `${notam.icao}-${index}`;
            const isExpanded = expandedNotams.has(notamId);
            
            return (
              <div
                key={notamId}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => toggleNotamExpansion(notamId)}
              >
                <div style={{ padding: '12px' }}>
                  {/* NOTAM Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>
                        {getCategoryIcon(notam.category)}
                      </span>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '13px', color: '#111827' }}>
                          {notam.subject || notam.category || 'NOTAM'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>
                          {notam.icao} • {notam.effectiveDate ? new Date(notam.effectiveDate).toLocaleDateString() : 'Active'}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {notam.severity && (
                        <span
                          style={{
                            backgroundColor: getSeverityColor(notam.severity),
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            fontSize: '10px',
                            fontWeight: '600'
                          }}
                        >
                          {notam.severity}
                        </span>
                      )}
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>

                  {/* NOTAM Preview */}
                  <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: '1.4' }}>
                    {isExpanded ? (
                      <div>
                        <div style={{ marginBottom: '8px' }}>
                          {notam.text || notam.description || 'No NOTAM text available'}
                        </div>
                        
                        {/* Parse Button */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              parseNotam(notam);
                            }}
                            disabled={loading}
                            style={{
                              padding: '4px 8px',
                              fontSize: '11px',
                              backgroundColor: '#f3f4f6',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            {loading ? 'Parsing...' : 'Parse with AI'}
                          </button>
                        </div>

                        {/* Parsed Information */}
                        {notam.parsed && (
                          <div style={{ 
                            marginTop: '8px', 
                            padding: '8px', 
                            backgroundColor: '#f0f9ff', 
                            borderRadius: '4px',
                            border: '1px solid #bae6fd'
                          }}>
                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#0c4a6e', marginBottom: '4px' }}>
                              AI Analysis:
                            </div>
                            <div style={{ fontSize: '11px', color: '#075985' }}>
                              {notam.parsed.description || 'Analysis complete'}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        {(notam.text || notam.description || '').slice(0, 100)}
                        {(notam.text || notam.description || '').length > 100 && '...'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}