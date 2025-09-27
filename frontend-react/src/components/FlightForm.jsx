import React, { useState, useEffect, useRef } from "react";
import { airportAPI, weatherAPI } from "../services/api";

// Weather data persistence utilities
const STORAGE_KEYS = {
  DEP_TAF: 'weather_dep_taf',
  ARR_TAF: 'weather_arr_taf',
  DEP_METAR: 'weather_dep_metar',
  ARR_METAR: 'weather_arr_metar',
  LAST_UPDATE: 'weather_last_update'
};

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes cache duration

// Save weather data to localStorage with timestamp
const saveWeatherData = (key, data) => {
  try {
    const weatherItem = {
      data: data,
      timestamp: Date.now(),
      icao: key.includes('dep') ? 'departure' : 'arrival'
    };
    localStorage.setItem(key, JSON.stringify(weatherItem));
  } catch (e) {
    console.warn('Failed to save weather data to localStorage:', e);
  }
};

// Load weather data from localStorage with expiry check
const loadWeatherData = (key) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    
    const weatherItem = JSON.parse(item);
    const now = Date.now();
    
    // Check if data is still valid (within cache duration)
    if (now - weatherItem.timestamp < CACHE_DURATION) {
      return weatherItem.data;
    } else {
      // Remove expired data
      localStorage.removeItem(key);
      return null;
    }
  } catch (e) {
    console.warn('Failed to load weather data from localStorage:', e);
    return null;
  }
};

export default function FlightForm({ onSubmit, onError, loading, onWeatherChange }) {
  // Weather autofill loading states
  const [loadingDepWx, setLoadingDepWx] = useState(false);
  const [loadingArrWx, setLoadingArrWx] = useState(false);
  // Auto-fetch toggle
  const [autoFetch, setAutoFetch] = useState(true);
  
  // Refs to track last successful TAF data to prevent accidental clearing
  const lastDepTafRef = useRef("");
  const lastArrTafRef = useRef("");
  const lastUpdateTimeRef = useRef(0);
  const userInteractionTimeRef = useRef(0);
  
  // Track user interactions to avoid refreshing during active use
  const updateUserInteraction = () => {
    userInteractionTimeRef.current = Date.now();
  };
  
  // Check if enough time has passed since last update and user isn't actively interacting
  const shouldRefresh = () => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    const timeSinceUserInteraction = now - userInteractionTimeRef.current;
    
    // Don't refresh if:
    // 1. Updated less than 2 minutes ago
    // 2. User interacted less than 30 seconds ago
    return timeSinceLastUpdate > 2 * 60 * 1000 && timeSinceUserInteraction > 30 * 1000;
  };

  // Fetch METAR/TAF for a given ICAO and set state with validation and smart refresh
  const fetchMetarTaf = async (icao, setMetar, setTaf, setLoading, tafRef, forceRefresh = false) => {
    if (!icao || icao.length !== 4) return;
    
    // Check if we should skip refresh due to timing
    if (!forceRefresh && !shouldRefresh()) {
      console.log(`Skipping refresh for ${icao} - too recent or user is active`);
      return;
    }
    
    setLoading && setLoading(true);
    lastUpdateTimeRef.current = Date.now();
    
    try {
      const [metarRes, tafRes] = await Promise.all([
        weatherAPI.getLatestMetar ? weatherAPI.getLatestMetar(icao) : weatherAPI.decodeMetar({ icao, metarString: undefined }),
        weatherAPI.getLatestTaf ? weatherAPI.getLatestTaf(icao) : weatherAPI.decodeTaf({ icao, tafString: undefined })
      ]);
      
      // Handle METAR response with validation
      if (metarRes && (metarRes.metar || metarRes.raw)) {
        const metarData = metarRes.metar || metarRes.raw;
        if (metarData && metarData.trim() && metarData !== 'N/A') {
          setMetar(metarData);
          // Save METAR to localStorage if setters support it
          if (setMetar === setDepMetarWithStorage || setMetar === setArrMetarWithStorage) {
            setMetar(metarData);
          }
        }
      }
      
      // Handle TAF response with enhanced validation
      if (tafRes) {
        let tafData;
        let hasValidForecastPeriods = false;
        
        if (typeof tafRes === 'object' && tafRes.raw) {
          // Direct raw response
          tafData = tafRes.raw;
        } else if (typeof tafRes === 'object' && tafRes.forecast) {
          // Enhanced forecast object with NLP - preserve the entire object for later use
          tafData = JSON.stringify(tafRes.forecast);
          // Check if forecast has valid periods
          try {
            const parsed = typeof tafRes.forecast === 'string' ? JSON.parse(tafRes.forecast) : tafRes.forecast;
            hasValidForecastPeriods = parsed.periods && parsed.periods.length > 0;
          } catch (e) {
            console.warn('Failed to parse forecast periods:', e);
          }
        } else if (typeof tafRes === 'string') {
          // Raw TAF string - check if it contains forecast periods
          tafData = tafRes;
          hasValidForecastPeriods = tafData.includes('FM') || tafData.includes('TEMPO') || tafData.includes('BECMG');
        } else if (tafRes.taf) {
          // Legacy format
          tafData = tafRes.taf;
          hasValidForecastPeriods = tafData.includes('FM') || tafData.includes('TEMPO') || tafData.includes('BECMG');
        }
        
        // Enhanced validation: Only update TAF if we have meaningful data AND forecast periods
        if (tafData && tafData.trim() && tafData !== 'N/A') {
          // If new data lacks forecast periods, prefer existing data that has them
          const existingData = tafRef ? tafRef.current : null;
          const existingHasPeriods = existingData && (
            existingData.includes('FM') || 
            existingData.includes('TEMPO') || 
            existingData.includes('BECMG') ||
            (existingData.includes('periods') && existingData.includes('['))
          );
          
          // Only replace existing data if new data has forecast periods OR if no existing data
          if (hasValidForecastPeriods || !existingHasPeriods || !existingData) {
            setTaf(tafData);
            if (tafRef) tafRef.current = tafData;
            console.log(`TAF data set for ${icao} (has periods: ${hasValidForecastPeriods}):`, tafData.substring(0, 100) + '...');
          } else {
            console.warn(`New TAF data for ${icao} lacks forecast periods, keeping existing data with periods`);
            // Keep existing data
            if (existingData) {
              setTaf(existingData);
            }
          }
        } else {
          console.warn('No valid TAF data received for', icao, ', keeping existing data');
          // If we have previous data, use it
          if (tafRef && tafRef.current) {
            setTaf(tafRef.current);
            console.log('Restored previous TAF data for', icao);
          }
        }
      }
    } catch (e) {
      console.error('fetchMetarTaf error for', icao, ':', e);
      onError && onError("Failed to fetch METAR/TAF for " + icao);
      // If we have previous data, restore it
      if (tafRef && tafRef.current) {
        setTaf(tafRef.current);
        console.log('Restored TAF data after error for', icao);
      }
    } finally {
      setLoading && setLoading(false);
    }
  };
  // Initialize state with cached data from localStorage
  const [origin, setOrigin] = useState("");
  const [depMetar, setDepMetar] = useState(() => loadWeatherData(STORAGE_KEYS.DEP_METAR) || "");
  const [depTaf, setDepTaf] = useState(() => loadWeatherData(STORAGE_KEYS.DEP_TAF) || "");
  const [depNotam, setDepNotam] = useState("");
  // Enroute
  const [sigmets, setSigmets] = useState("");
  const [pireps, setPireps] = useState("");
  // Arrival
  const [destination, setDestination] = useState("");
  const [arrMetar, setArrMetar] = useState(() => loadWeatherData(STORAGE_KEYS.ARR_METAR) || "");
  const [arrTaf, setArrTaf] = useState(() => loadWeatherData(STORAGE_KEYS.ARR_TAF) || "");
  const [arrNotam, setArrNotam] = useState("");

  // Initialize refs with cached data
  useEffect(() => {
    const cachedDepTaf = loadWeatherData(STORAGE_KEYS.DEP_TAF);
    const cachedArrTaf = loadWeatherData(STORAGE_KEYS.ARR_TAF);
    if (cachedDepTaf) lastDepTafRef.current = cachedDepTaf;
    if (cachedArrTaf) lastArrTafRef.current = cachedArrTaf;
  }, []);

  // Enhanced TAF setters that also update the refs and localStorage for persistence
  const setDepTafWithRef = (value) => {
    setDepTaf(value);
    lastDepTafRef.current = value;
    saveWeatherData(STORAGE_KEYS.DEP_TAF, value);
  };
  
  const setArrTafWithRef = (value) => {
    setArrTaf(value);
    lastArrTafRef.current = value;
    saveWeatherData(STORAGE_KEYS.ARR_TAF, value);
  };

  // Enhanced METAR setters for consistency
  const setDepMetarWithStorage = (value) => {
    setDepMetar(value);
    saveWeatherData(STORAGE_KEYS.DEP_METAR, value);
  };
  
  const setArrMetarWithStorage = (value) => {
    setArrMetar(value);
    saveWeatherData(STORAGE_KEYS.ARR_METAR, value);
  };

  // Dynamic weather update
  useEffect(() => {
    if (onWeatherChange) {
      onWeatherChange({
        depMetar, arrMetar, depTaf, arrTaf, depNotam, arrNotam, sigmets, pireps
      });
    }
  }, [depMetar, arrMetar, depTaf, arrTaf, depNotam, arrNotam, sigmets, pireps, onWeatherChange]);

  // Live ICAO lookup for airport names
  const [originInfo, setOriginInfo] = useState(null);
  const [originLookup, setOriginLookup] = useState("idle"); // idle|loading|ok|notfound|error
  const [destInfo, setDestInfo] = useState(null);
  const [destLookup, setDestLookup] = useState("idle");

  // ICAO lookup for airport names is retained, but automatic METAR/TAF fetching is disabled.
  useEffect(() => {
    if (!origin || origin.length !== 4) {
      setOriginInfo(null);
      setOriginLookup("idle");
      return;
    }
    setOriginLookup("loading");
    const t = setTimeout(async () => {
      try {
        const info = await airportAPI.getAirportInfo(origin.toUpperCase());
        if (info?.airport?.name) {
          setOriginInfo(info.airport);
          setOriginLookup("ok");
          // Auto-fetch METAR/TAF if toggle is ON
          if (autoFetch) {
            fetchMetarTaf(origin.toUpperCase(), setDepMetar, setDepTafWithRef, setLoadingDepWx, lastDepTafRef);
          }
        } else {
          setOriginInfo(null);
          setOriginLookup("notfound");
        }
      } catch (e) {
        setOriginInfo(null);
        setOriginLookup("error");
      }
    }, 300);
    return () => clearTimeout(t);
  }, [origin, autoFetch]);

  useEffect(() => {
    if (!destination || destination.length !== 4) {
      setDestInfo(null);
      setDestLookup("idle");
      return;
    }
    setDestLookup("loading");
    const t = setTimeout(async () => {
      try {
        const info = await airportAPI.getAirportInfo(destination.toUpperCase());
        if (info?.airport?.name) {
          setDestInfo(info.airport);
          setDestLookup("ok");
          // Auto-fetch METAR/TAF if toggle is ON
          if (autoFetch) {
            fetchMetarTaf(destination.toUpperCase(), setArrMetar, setArrTafWithRef, setLoadingArrWx, lastArrTafRef);
          }
        } else {
          setDestInfo(null);
          setDestLookup("notfound");
        }
      } catch (e) {
        setDestInfo(null);
        setDestLookup("error");
      }
    }, 300);
    return () => clearTimeout(t);
  }, [destination, autoFetch]);
  // (Optional) In future we can auto-fill fields from live APIs when ICAO is valid

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!origin || !destination) {
      onError && onError("Origin and destination ICAO codes are required.");
      return;
    }
    if (origin.length !== 4 || destination.length !== 4) {
      onError && onError("ICAO codes must be exactly 4 characters.");
      return;
    }
    const payload = {
      origin: {
        icao: origin.toUpperCase(),
        metar: depMetar || undefined,
        taf: depTaf || undefined,
        notams: depNotam || undefined,
      },
      enroute: {
        sigmets: sigmets || undefined,
        pireps: pireps || undefined,
      },
      destination: {
        icao: destination.toUpperCase(),
        metar: arrMetar || undefined,
        taf: arrTaf || undefined,
        notams: arrNotam || undefined,
      }
    };
    onSubmit(payload);
  };


  // Demo input handler
  const fillDemo = () => {
    setOrigin("KORD");
    setDepMetar("KORD 271651Z 18005KT 10SM FEW020 SCT250 25/12 A3012 RMK AO2 SLP200");
    setDepTafWithRef(`TAF KORD 271120Z 2712/2818 17008KT P6SM SCT025
      FM271800 20012KT P6SM BKN035
      FM280000 22010KT P6SM SCT050`);
    setDepNotam("RWY 10L/28R CLSD 1200-1800Z DLY; TWY B CLSD BTN B2 AND B3");
    setSigmets(`SIGMET NOVEMBER 2 VALID 271800/272200 KZNY- SEV TURB FCST BTN FL180 AND FL340
SIGMET OSCAR 1 VALID 271900/272300 KZLA- SEV ICE FCST BTN FL120 AND FL200`);
    setPireps(`UA /OV DCA270015 /TM 1920 /FL080 /TP B737 /TB MOD /IC NEG /SK BKN070-TOP090
UA /OV ORD180020 /TM 2000 /FL060 /TP E145 /TB LGT-MOD CHOP /IC NEG /SK SCT040`);
    setDestination("KSFO");
    setArrMetar("KSFO 271656Z 29010KT 10SM FEW008 SCT250 18/12 A3005 RMK AO2 SLP176");
    setArrTafWithRef(`TAF KSFO 271130Z 2712/2818 30008KT P6SM FEW008 SCT250
      FM271800 32012KT P6SM BKN015
      FM280000 28010KT P6SM SCT020`);
    setArrNotam("RWY 28L/10R CLSD 1400-2000Z DLY; ILS RWY 28R U/S");
  };

  const clearForm = () => {
    setOrigin("");
    setDepMetar("");
    setDepTafWithRef("");
    setDepNotam("");
    setSigmets("");
    setPireps("");
    setDestination("");
    setArrMetar("");
    setArrTafWithRef("");
    setArrNotam("");
  };

  return (
    <div className="flight-form-container" style={{padding: '8px 0'}}>
      <h2 className="form-title" style={{fontSize: '20px', fontWeight: 700, color: 'var(--accent-600)', marginBottom: 18}}>Pilot Weather Briefing</h2>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
        <label style={{fontWeight:600, color:'var(--accent-600)'}}>Auto-fetch METAR/TAF</label>
        <input type="checkbox" checked={autoFetch} onChange={e=>setAutoFetch(e.target.checked)} style={{width:18,height:18}} />
        
        <button
          type="button"
          onClick={() => {
            if (origin && origin.length === 4) {
              fetchMetarTaf(origin.toUpperCase(), setDepMetarWithStorage, setDepTafWithRef, setLoadingDepWx, lastDepTafRef, true);
            }
            if (destination && destination.length === 4) {
              fetchMetarTaf(destination.toUpperCase(), setArrMetarWithStorage, setArrTafWithRef, setLoadingArrWx, lastArrTafRef, true);
            }
          }}
          disabled={(!origin || origin.length !== 4) && (!destination || destination.length !== 4)}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            background: 'var(--accent-600)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginLeft: '12px'
          }}
        >
          🔄 Refresh Weather
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flight-form">
        {/* Departure Section */}
        <div className="card" style={{marginBottom: '18px', background: '#f7fbfc'}}>
          <div style={{fontWeight:700, fontSize:'16px', color:'var(--accent-600)', marginBottom:'10px'}}>🛫 Departure</div>
          <div className="form-row" style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <label className="label">Origin ICAO *</label>
            <input 
              className={`input`} 
              value={origin} 
              onChange={(e) => setOrigin(e.target.value.toUpperCase())} 
              placeholder="e.g. KORD" 
              maxLength={4} 
              required 
              style={{ flex: 1 }}
            />
            {/* Auto-Fill Wx button removed as requested */}
            {origin && origin.length === 4 && (
              <small style={{
                display: 'block', marginTop: 6,
                color: originLookup === 'ok' ? '#16a34a' : originLookup === 'loading' ? '#64748b' : originLookup === 'error' ? '#dc2626' : '#ea580c',
                fontWeight: 500
              }}>
                {originLookup === 'loading' && 'Looking up airport…'}
                {originLookup === 'ok' && `✓ ${originInfo?.name}`}
                {originLookup === 'notfound' && '⚠ Not in DB'}
                {originLookup === 'error' && '⚠ Lookup error'}
              </small>
            )}
            
          </div>
          <div className="form-row" style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <label className="label">METAR *</label>
            <textarea className="input textarea" value={depMetar} onChange={(e) => setDepMetar(e.target.value)} placeholder="Paste METAR report..." rows={2} required />
          </div>
          <div className="form-row">
            <label className="label">TAF *</label>
            <textarea 
              className="input textarea" 
              value={depTaf} 
              onChange={(e) => {
                updateUserInteraction();
                setDepTafWithRef(e.target.value);
              }}
              onFocus={updateUserInteraction}
              placeholder="Paste TAF report..." 
              rows={2} 
              required 
            />
          </div>
          <div className="form-row">
            <label className="label">NOTAMs (optional)</label>
            <textarea className="input textarea" value={depNotam} onChange={(e) => setDepNotam(e.target.value)} placeholder="Runway closures, taxiway restrictions..." rows={2} />
          </div>
          {/* Runway/Performance and Planned Departure Time removed */}
        </div>

        {/* Enroute Section */}
        <div className="card" style={{marginBottom: '18px', background: '#f7fbfc'}}>
          <div style={{fontWeight:700, fontSize:'16px', color:'var(--accent-600)', marginBottom:'10px'}}>✈️ Enroute Essentials</div>
          <div className="form-row">
            <label className="label">SIGMETs (optional)</label>
            <textarea className="input textarea" value={sigmets} onChange={(e) => setSigmets(e.target.value)} placeholder="Severe turbulence, icing, volcanic ash..." rows={2} />
          </div>
          <div className="form-row">
            <label className="label">PIREPs (optional)</label>
            <textarea className="input textarea" value={pireps} onChange={(e) => setPireps(e.target.value)} placeholder="Turbulence, icing, cloud tops/bases..." rows={2} />
          </div>
          {/* Enroute NOTAMs removed */}
        </div>

        {/* Arrival Section */}
        <div className="card" style={{marginBottom: '18px', background: '#f7fbfc'}}>
          <div style={{fontWeight:700, fontSize:'16px', color:'var(--accent-600)', marginBottom:'10px'}}>🛬 Arrival</div>
          <div className="form-row">
            <label className="label">Destination ICAO *</label>
            <input 
              className={`input`} 
              value={destination} 
              onChange={(e) => setDestination(e.target.value.toUpperCase())} 
              placeholder="e.g. KSFO" 
              maxLength={4} 
              required 
              style={{ flex: 1 }}
            />
            {/* Auto-Fill Wx button removed as requested */}
            {destination && destination.length === 4 && (
              <small style={{
                display: 'block', marginTop: 6,
                color: destLookup === 'ok' ? '#16a34a' : destLookup === 'loading' ? '#64748b' : destLookup === 'error' ? '#dc2626' : '#ea580c',
                fontWeight: 500
              }}>
                {destLookup === 'loading' && 'Looking up airport…'}
                {destLookup === 'ok' && `✓ ${destInfo?.name}`}
                {destLookup === 'notfound' && '⚠ Not in DB'}
                {destLookup === 'error' && '⚠ Lookup error'}
              </small>
            )}
            
          </div>
          <div className="form-row">
            <label className="label">METAR *</label>
            <textarea className="input textarea" value={arrMetar} onChange={(e) => setArrMetar(e.target.value)} placeholder="Paste METAR report..." rows={2} required />
          </div>
          <div className="form-row">
            <label className="label">TAF *</label>
            <textarea 
              className="input textarea" 
              value={arrTaf} 
              onChange={(e) => {
                updateUserInteraction();
                setArrTafWithRef(e.target.value);
              }}
              onFocus={updateUserInteraction}
              placeholder="Paste TAF report..." 
              rows={2} 
              required 
            />
          </div>
          <div className="form-row">
            <label className="label">NOTAMs (optional)</label>
            <textarea className="input textarea" value={arrNotam} onChange={(e) => setArrNotam(e.target.value)} placeholder="Runway availability, nav aid outages..." rows={2} />
          </div>
        </div>

        <div className="form-actions" style={{display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '18px'}}>
          <button type="button" onClick={fillDemo} className="btn btn-secondary" disabled={loading} style={{width: '100%'}}>Demo Input</button>
          <button type="button" onClick={clearForm} className="btn btn-ghost" disabled={loading} style={{width: '100%'}}>Clear</button>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{width: '100%'}}>{loading ? "Generating Briefing..." : "Get Briefing"}</button>
        </div>
        <div className="form-help">
          <p>* Required fields</p>
          <p>Enter any 4-letter ICAO airport code (e.g., KJFK, KSFO, KORD, KLAX).</p>
          <p>Paste METAR and TAF for each airport. NOTAMs are optional.</p>
        </div>
      </form>
    </div>
  );
}