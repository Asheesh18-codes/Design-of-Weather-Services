import React, { useState } from "react";

export default function FlightForm({ onSubmit, onError, loading }) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [pasted, setPasted] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!origin && !pasted) {
      onError && onError("Provide ICAO or paste report.");
      return;
    }
    const payload = {
      origin: origin ? origin.toUpperCase() : undefined,
      destination: destination ? destination.toUpperCase() : undefined,
      text: pasted || undefined
    };
    onSubmit(payload);
  };

  const fillDemo = () => {
    setOrigin("KJFK");
    setDestination("KSFO");
    setPasted("KJFK 251651Z 18005KT 10SM CLR 25/12 A3012");
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <label className="label">Origin ICAO</label>
        <input
          className="input"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="e.g. KJFK"
        />
      </div>
      <div className="form-row">
        <label className="label">Destination ICAO</label>
        <input
          className="input"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="e.g. KSFO"
        />
      </div>
      <div className="form-row">
        <label className="label">Paste coded report</label>
        <textarea
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
