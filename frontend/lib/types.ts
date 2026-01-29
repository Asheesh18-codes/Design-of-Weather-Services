// Aviation Data Types

export interface Airport {
  icao: string;
  iata?: string;
  name: string;
  city?: string;
  country?: string;
  lat: number;
  lon: number;
  elevation?: number;
}

export interface Waypoint extends Airport {
  type?: 'departure' | 'arrival' | 'enroute';
}

export interface ParsedMetar {
  station: string;
  time?: string;
  temperature_c?: number;
  dewpoint_c?: number;
  wind_direction?: number;
  wind_speed?: number;
  wind_gust?: number;
  visibility?: string | number;
  altimeter?: number;
  flight_rules?: string;
  clouds?: CloudLayer[];
  raw: string;
  summary?: string;
  humanReadable?: string;
}

export interface CloudLayer {
  coverage?: string;
  base?: number;
  base_ft?: number;
  type?: string;
  altitude?: number;
  height?: number;
}

export interface ParsedTaf {
  station: string;
  valid_from?: string;
  valid_to?: string;
  raw: string;
  periods?: TafPeriod[];
  summary?: string;
  humanReadable?: string;
  nlp?: {
    summary?: string;
    keyPoints?: string[];
    recommendations?: string[];
  };
}

export interface TafPeriod {
  start_time?: string;
  end_time?: string;
  wind_direction?: number;
  wind_speed?: number;
  visibility?: string | number;
  weather?: string;
  clouds?: CloudLayer[];
}

export interface Notam {
  id?: string;
  icao: string;
  text?: string;
  description?: string;
  subject?: string;
  category?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH';
  effectiveDate?: string;
  expiryDate?: string;
  parsed?: NotamParsed;
}

export interface NotamParsed {
  description?: string;
  affectedRunways?: string[];
  affectedTaxiways?: string[];
  restrictions?: string[];
  duration?: string;
}

export interface Sigmet {
  id?: string;
  hazard: 'TURBULENCE' | 'ICING' | 'THUNDERSTORM' | 'VOLCANIC_ASH' | 'OTHER';
  intensity?: 'LIGHT' | 'MODERATE' | 'SEVERE' | 'ISOLATED' | 'OCCASIONAL' | 'FREQUENT';
  coordinates?: number[][];
  description?: string;
  validTime?: string;
  color?: string;
}

export interface Pirep {
  id?: string;
  location?: string;
  altitude?: number;
  aircraft?: string;
  turbulence?: string;
  icing?: string;
  visibility?: string;
  weather?: string;
  time?: string;
}

export interface FlightPlan {
  origin: Waypoint;
  destination: Waypoint;
  waypoints?: Waypoint[];
  altitude?: number;
  distance?: number;
  estimatedTime?: string;
  success?: boolean;
  route?: {
    origin?: Waypoint;
    destination?: Waypoint;
  };
}

export interface WeatherBriefing {
  origin: Airport;
  destination: Airport;
  metar?: {
    dep?: ParsedMetar;
    arr?: ParsedMetar;
  };
  taf?: {
    dep?: ParsedTaf;
    arr?: ParsedTaf;
  };
  notams?: {
    origin?: Notam[];
    destination?: Notam[];
    route?: Notam[];
  };
  sigmets?: Sigmet[];
  pireps?: Pirep[];
  severity?: 'CLEAR' | 'SIGNIFICANT' | 'SEVERE';
  summary?: string;
  timestamp?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface WeatherSearchResult {
  icao: string;
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
}
