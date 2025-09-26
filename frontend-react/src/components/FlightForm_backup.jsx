import React, { useState } from "react";

export default function FlightForm({ onSubmit, onError, loading }) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [altitude, setAltitude] = useState("10000");
  const [aircraftType, setAircraftType] = useState("C172");
  const [departureTime, setDepartureTime] = useState(() => {
    // Default to current time + 1 hour
    const now = new Date();
    now.setHours(now.getHours() + 1);
    return now.toISOString().slice(0, 16); // Format for datetime-local input
  });
  const [pilotMetar, setPilotMetar] = useState("");

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
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      altitude: parseInt(altitude) || 10000,
      aircraftType: aircraftType,
      departureTime: departureTime,
      pilotMetar: pilotMetar || undefined
    };
    
    onSubmit(payload);
  };

  const fillDemo = () => {
    setOrigin("KJFK");
    setDestination("KSFO");
    setAltitude("35000");
    setAircraftType("B737");
    setPilotMetar("KJFK 251651Z 18005KT 10SM CLR 25/12 A3012");
  };

  const clearForm = () => {
    setOrigin("");
    setDestination("");
    setAltitude("10000");
    setAircraftType("C172");
    setPilotMetar("");
    // Reset departure time to current time + 1 hour
    const now = new Date();
    now.setHours(now.getHours() + 1);
    setDepartureTime(now.toISOString().slice(0, 16));
  };

  return (
    <div className="flight-form-container">
      <h2 className="form-title">Flight Planning</h2>
      <form onSubmit={handleSubmit} className="flight-form">
        <div className="form-grid">
          <div className="form-row">
            <label className="label">Origin ICAO *</label>
            <input
              className="input"
              value={origin}
              onChange={(e) => setOrigin(e.target.value.toUpperCase())}
              placeholder="e.g. KJFK"
              maxLength={4}
              required
            />
          </div>
          
          <div className="form-row">
            <label className="label">Destination ICAO *</label>
            <input
              className="input"
              value={destination}
              onChange={(e) => setDestination(e.target.value.toUpperCase())}
              placeholder="e.g. KSFO"
              maxLength={4}
              required
            />
          </div>
          
          <div className="form-row">
            <label className="label">Cruise Altitude (ft)</label>
            <input
              className="input"
              type="number"
              value={altitude}
              onChange={(e) => setAltitude(e.target.value)}
              placeholder="10000"
              min="1000"
              max="45000"
              step="500"
            />
          </div>
          
          <div className="form-row">
            <label className="label">Aircraft Type</label>
            <select
              className="input"
              value={aircraftType}
              onChange={(e) => setAircraftType(e.target.value)}
            >
              <option value="C152">C152 - Cessna 152</option>
              <option value="C172">C172 - Cessna 172</option>
              <option value="C182">C182 - Cessna 182</option>
              <option value="PA28">PA28 - Piper Cherokee</option>
              <option value="B737">B737 - Boeing 737</option>
              <option value="A320">A320 - Airbus A320</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          
          <div className="form-row full-width">
            <label className="label">Planned Departure Time</label>
            <input
              className="input"
              type="datetime-local"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <label className="label">Pilot METAR (Optional)</label>
          <textarea
            className="input textarea"
            value={pilotMetar}
            onChange={(e) => setPilotMetar(e.target.value)}
            placeholder="Paste current METAR or weather observation..."
            rows={3}
          />
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            onClick={fillDemo} 
            className="btn btn-secondary"
            disabled={loading}
          >
            Fill Demo Data
          </button>
          
          <button 
            type="button" 
            onClick={clearForm} 
            className="btn btn-secondary"
            disabled={loading}
          >
            Clear Form
          </button>
          
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? "Generating Briefing..." : "Get Flight Briefing"}
          </button>
        </div>
        
        <div className="form-help">
          <p>* Required fields</p>
          <p>Enter valid 4-letter ICAO airport codes (e.g., KJFK for JFK Airport)</p>
        </div>
      </form>
    </div>
  );
}
          className="textarea-small input"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder="Paste raw METAR/TAF/NOTAM string"
        />
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Parsing…" : "Get Briefing"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={fillDemo}>
          Fill example
        </button>
      </div>
    </form>
  );
}
