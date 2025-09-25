// simple axios wrapper for frontend
import axios from "axios"

const API_BASE = import.meta.env.VITE_API_BASE || "/api" // default proxy to /api

const client = axios.create({
  baseURL: API_BASE,
  timeout: 8000,
})

// parseWeather(payload) -> calls POST /parse (or /weather/parse)
export async function parseWeather(payload) {
  // Backend endpoint - adjust path to your node-api (e.g. /api/parse or /api/route-summary)
  const endpoint = "/parse" // ensure your Node backend exposes POST /api/parse and router mounts to /api

  try {
    const resp = await client.post(endpoint, payload)
    // assume backend returns parsed JSON in resp.data
    return resp.data
  } catch (err) {
    // If network error or backend not available, fall back to local demo (so frontend remains functional)
    console.warn("parseWeather: backend failed, returning demo fallback. Error:", err?.message || err)

    // throw the error so callers can show a message, OR return fallback. Here we prefer fallback.
    const demo = {
      product: "METAR",
      raw: "KJFK 251651Z 18005KT 10SM CLR 25/12 A3012",
      parsed: { station: "KJFK", time: "251651Z", wind: "18005KT", lat: 40.6413, lon: -73.7781 },
      category: "Clear",
      summary: "KJFK: Clear skies, wind 180° at 5 kt, temp 25°C.",
      hf_summary: "No significant weather along route.",
      route: {
        origin: { icao: "KJFK", lat: 40.6413, lon: -73.7781, label: "JFK" },
        destination: { icao: "KSFO", lat: 37.6213, lon: -122.3790, label: "SFO" }
      },
      sigmet_geojson: null
    }

    // return demo so the UI can show something; you can alternatively throw to signal failure
    return demo
  }
}
