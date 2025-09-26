/**
 * Airport Service - Utilities for airport data lookup and coordinate retrieval
 * Integrates with airports.json database for ICAO/IATA code resolution
 */

const fs = require('fs');
const path = require('path');

class AirportService {
  constructor() {
    this.airports = null;
    this.airportIndex = null;
    this.loadAirports();
  }

  /**
   * Load airports data from JSON file and create search indices
   */
  loadAirports() {
    try {
      const airportsPath = path.join(__dirname, 'airports.json');
      const airportsData = fs.readFileSync(airportsPath, 'utf8');
      this.airports = JSON.parse(airportsData);
      
      // Create search indices for faster lookup
      this.createSearchIndices();
      
      console.log(`✈️ Loaded ${this.airports.length} airports from database`);
    } catch (error) {
      console.error('❌ Failed to load airports database:', error.message);
      this.airports = [];
      this.airportIndex = {};
    }
  }

  /**
   * Create search indices for ICAO, IATA, GPS, and local codes
   */
  createSearchIndices() {
    this.airportIndex = {
      icao: new Map(),
      iata: new Map(),
      gps: new Map(),
      local: new Map(),
      ident: new Map()
    };

    this.airports.forEach(airport => {
      // Index by ICAO code
      if (airport.icao_code) {
        this.airportIndex.icao.set(airport.icao_code.toUpperCase(), airport);
      }
      
      // Index by IATA code
      if (airport.iata_code) {
        this.airportIndex.iata.set(airport.iata_code.toUpperCase(), airport);
      }
      
      // Index by GPS code
      if (airport.gps_code) {
        this.airportIndex.gps.set(airport.gps_code.toUpperCase(), airport);
      }
      
      // Index by local code
      if (airport.local_code) {
        this.airportIndex.local.set(airport.local_code.toUpperCase(), airport);
      }
      
      // Index by identifier
      if (airport.ident) {
        this.airportIndex.ident.set(airport.ident.toUpperCase(), airport);
      }
    });

    console.log(`📊 Created search indices: ${this.airportIndex.icao.size} ICAO, ${this.airportIndex.iata.size} IATA, ${this.airportIndex.gps.size} GPS codes`);
  }

  /**
   * Find airport by ICAO code
   * @param {string} icaoCode - 4-letter ICAO code (e.g., 'KJFK', 'EGLL')
   * @returns {Object|null} - Airport data with coordinates or null if not found
   */
  findByICAO(icaoCode) {
    if (!icaoCode || typeof icaoCode !== 'string') {
      return null;
    }
    
    const code = icaoCode.toUpperCase().trim();
    return this.airportIndex.icao.get(code) || null;
  }

  /**
   * Find airport by IATA code
   * @param {string} iataCode - 3-letter IATA code (e.g., 'JFK', 'LHR')
   * @returns {Object|null} - Airport data with coordinates or null if not found
   */
  findByIATA(iataCode) {
    if (!iataCode || typeof iataCode !== 'string') {
      return null;
    }
    
    const code = iataCode.toUpperCase().trim();
    return this.airportIndex.iata.get(code) || null;
  }

  /**
   * Find airport by any code type (ICAO, IATA, GPS, local, or identifier)
   * @param {string} code - Airport code of any type
   * @returns {Object|null} - Airport data with coordinates or null if not found
   */
  findByCode(code) {
    if (!code || typeof code !== 'string') {
      return null;
    }
    
    const upperCode = code.toUpperCase().trim();
    
    // Try different code types in order of preference
    return this.airportIndex.icao.get(upperCode) ||
           this.airportIndex.iata.get(upperCode) ||
           this.airportIndex.gps.get(upperCode) ||
           this.airportIndex.local.get(upperCode) ||
           this.airportIndex.ident.get(upperCode) ||
           null;
  }

  /**
   * Get airport coordinates for mapping
   * @param {string} code - Airport code (ICAO/IATA/GPS/etc)
   * @returns {Object|null} - {lat, lon, elevation, name, icao, iata} or null
   */
  getCoordinates(code) {
    const airport = this.findByCode(code);
    
    if (!airport) {
      return null;
    }

    return {
      lat: airport.latitude_deg,
      lon: airport.longitude_deg,
      elevation: airport.elevation_ft,
      name: airport.name,
      icao: airport.icao_code,
      iata: airport.iata_code,
      type: airport.type,
      municipality: airport.municipality,
      country: airport.iso_country
    };
  }

  /**
   * Get multiple airport coordinates for route planning
   * @param {string[]} codes - Array of airport codes
   * @returns {Object[]} - Array of coordinate objects
   */
  getMultipleCoordinates(codes) {
    if (!Array.isArray(codes)) {
      return [];
    }

    return codes.map(code => {
      const coords = this.getCoordinates(code);
      return coords ? { code, ...coords } : { code, error: 'Airport not found' };
    });
  }

  /**
   * Search airports by name (partial match)
   * @param {string} query - Search query
   * @param {number} limit - Maximum number of results (default: 10)
   * @returns {Object[]} - Array of matching airports
   */
  searchByName(query, limit = 10) {
    if (!query || typeof query !== 'string') {
      return [];
    }

    const searchTerm = query.toLowerCase().trim();
    const results = [];

    for (const airport of this.airports) {
      if (airport.name && airport.name.toLowerCase().includes(searchTerm)) {
        results.push({
          code: airport.icao_code || airport.iata_code || airport.ident,
          name: airport.name,
          lat: airport.latitude_deg,
          lon: airport.longitude_deg,
          type: airport.type,
          municipality: airport.municipality,
          country: airport.iso_country
        });

        if (results.length >= limit) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Calculate great circle distance between two airports
   * @param {string} code1 - First airport code
   * @param {string} code2 - Second airport code
   * @returns {Object|null} - {distance_km, distance_nm, bearing} or null
   */
  calculateDistance(code1, code2) {
    const airport1 = this.findByCode(code1);
    const airport2 = this.findByCode(code2);

    if (!airport1 || !airport2) {
      return null;
    }

    const lat1 = airport1.latitude_deg * Math.PI / 180;
    const lat2 = airport2.latitude_deg * Math.PI / 180;
    const deltaLat = (airport2.latitude_deg - airport1.latitude_deg) * Math.PI / 180;
    const deltaLon = (airport2.longitude_deg - airport1.longitude_deg) * Math.PI / 180;

    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const distance_km = 6371 * c; // Earth's radius in kilometers
    const distance_nm = distance_km * 0.539957; // Convert to nautical miles

    // Calculate bearing
    const y = Math.sin(deltaLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
    const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

    return {
      distance_km: Math.round(distance_km * 100) / 100,
      distance_nm: Math.round(distance_nm * 100) / 100,
      bearing: Math.round(bearing * 10) / 10,
      from: {
        code: code1,
        name: airport1.name,
        lat: airport1.latitude_deg,
        lon: airport1.longitude_deg
      },
      to: {
        code: code2,
        name: airport2.name,
        lat: airport2.latitude_deg,
        lon: airport2.longitude_deg
      }
    };
  }

  /**
   * Get airports within a radius of a given point
   * @param {number} lat - Center latitude
   * @param {number} lon - Center longitude  
   * @param {number} radius_km - Radius in kilometers
   * @param {number} limit - Maximum results (default: 50)
   * @returns {Object[]} - Array of nearby airports with distances
   */
  findNearby(lat, lon, radius_km, limit = 50) {
    const results = [];
    
    for (const airport of this.airports) {
      if (!airport.latitude_deg || !airport.longitude_deg) continue;
      
      const distance = this.calculateDistanceBetweenPoints(
        lat, lon, airport.latitude_deg, airport.longitude_deg
      );
      
      if (distance <= radius_km) {
        results.push({
          code: airport.icao_code || airport.iata_code || airport.ident,
          name: airport.name,
          lat: airport.latitude_deg,
          lon: airport.longitude_deg,
          distance_km: Math.round(distance * 100) / 100,
          type: airport.type,
          municipality: airport.municipality
        });
      }
    }

    // Sort by distance and limit results
    return results.sort((a, b) => a.distance_km - b.distance_km).slice(0, limit);
  }

  /**
   * Helper method to calculate distance between two points
   * @param {number} lat1 - First point latitude
   * @param {number} lon1 - First point longitude
   * @param {number} lat2 - Second point latitude
   * @param {number} lon2 - Second point longitude
   * @returns {number} - Distance in kilometers
   */
  calculateDistanceBetweenPoints(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Get airport statistics
   * @returns {Object} - Database statistics
   */
  getStats() {
    const stats = {
      total_airports: this.airports.length,
      by_type: {},
      by_country: {},
      with_icao: 0,
      with_iata: 0,
      with_coordinates: 0
    };

    this.airports.forEach(airport => {
      // Count by type
      stats.by_type[airport.type] = (stats.by_type[airport.type] || 0) + 1;
      
      // Count by country
      stats.by_country[airport.iso_country] = (stats.by_country[airport.iso_country] || 0) + 1;
      
      // Count codes
      if (airport.icao_code) stats.with_icao++;
      if (airport.iata_code) stats.with_iata++;
      if (airport.latitude_deg && airport.longitude_deg) stats.with_coordinates++;
    });

    return stats;
  }
}

// Create singleton instance
const airportService = new AirportService();

module.exports = airportService;