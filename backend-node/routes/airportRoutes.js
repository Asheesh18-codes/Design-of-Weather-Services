/**
 * Airport Routes - API endpoints for airport data and coordinates
 * Provides ICAO/IATA lookup, coordinate retrieval, and mapping utilities
 */

const express = require('express');
const router = express.Router();
const airportService = require('../utils/airportService');

/**
 * GET /api/airports/lookup/:code
 * Find airport by ICAO, IATA, or any code type
 */
router.get('/lookup/:code', (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code) {
      return res.status(400).json({
        error: 'Airport code is required',
        example: '/api/airports/lookup/KJFK'
      });
    }

    const airport = airportService.findByCode(code);
    
    if (!airport) {
      return res.status(404).json({
        error: 'Airport not found',
        code: code.toUpperCase(),
        suggestion: 'Try using ICAO code (4 letters) like KJFK, EGLL, or IATA code (3 letters) like JFK, LHR'
      });
    }

    res.json({
      success: true,
      airport: {
        code: airport.icao_code || airport.iata_code || airport.ident,
        name: airport.name,
        icao: airport.icao_code,
        iata: airport.iata_code,
        coordinates: {
          lat: airport.latitude_deg,
          lon: airport.longitude_deg,
          elevation_ft: airport.elevation_ft
        },
        location: {
          municipality: airport.municipality,
          region: airport.iso_region,
          country: airport.iso_country
        },
        type: airport.type,
        scheduled_service: airport.scheduled_service
      }
    });
  } catch (error) {
    console.error('Airport lookup error:', error);
    res.status(500).json({
      error: 'Failed to lookup airport',
      message: error.message
    });
  }
});

/**
 * GET /api/airports/coordinates/:code
 * Get airport coordinates for mapping (lightweight response)
 */
router.get('/coordinates/:code', (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code) {
      return res.status(400).json({
        error: 'Airport code is required'
      });
    }

    const coords = airportService.getCoordinates(code);
    
    if (!coords) {
      return res.status(404).json({
        error: 'Airport coordinates not found',
        code: code.toUpperCase()
      });
    }

    res.json({
      success: true,
      code: code.toUpperCase(),
      ...coords
    });
  } catch (error) {
    console.error('Coordinates lookup error:', error);
    res.status(500).json({
      error: 'Failed to get airport coordinates',
      message: error.message
    });
  }
});

/**
 * POST /api/airports/route-coordinates
 * Get coordinates for multiple airports (route planning)
 * Body: { "airports": ["KJFK", "EGLL", "LFPG"] }
 */
router.post('/route-coordinates', (req, res) => {
  try {
    const { airports } = req.body;
    
    if (!airports || !Array.isArray(airports)) {
      return res.status(400).json({
        error: 'Invalid request body',
        required: 'airports array',
        example: { airports: ["KJFK", "EGLL", "LFPG"] }
      });
    }

    if (airports.length === 0) {
      return res.status(400).json({
        error: 'At least one airport code is required'
      });
    }

    if (airports.length > 20) {
      return res.status(400).json({
        error: 'Too many airports requested (max 20)'
      });
    }

    const coordinates = airportService.getMultipleCoordinates(airports);
    
    const validCoords = coordinates.filter(coord => !coord.error);
    const errors = coordinates.filter(coord => coord.error);

    res.json({
      success: true,
      total_requested: airports.length,
      found: validCoords.length,
      coordinates: validCoords,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Route coordinates error:', error);
    res.status(500).json({
      error: 'Failed to get route coordinates',
      message: error.message
    });
  }
});

/**
 * GET /api/airports/distance/:from/:to
 * Calculate distance between two airports
 */
router.get('/distance/:from/:to', (req, res) => {
  try {
    const { from, to } = req.params;
    
    if (!from || !to) {
      return res.status(400).json({
        error: 'Both from and to airport codes are required',
        example: '/api/airports/distance/KJFK/EGLL'
      });
    }

    const distance = airportService.calculateDistance(from, to);
    
    if (!distance) {
      return res.status(404).json({
        error: 'Could not calculate distance',
        reason: 'One or both airports not found',
        from: from.toUpperCase(),
        to: to.toUpperCase()
      });
    }

    res.json({
      success: true,
      route: {
        from: distance.from,
        to: distance.to
      },
      distance: {
        kilometers: distance.distance_km,
        nautical_miles: distance.distance_nm,
        statute_miles: Math.round(distance.distance_km * 0.621371 * 100) / 100
      },
      bearing: distance.bearing,
      great_circle: true
    });
  } catch (error) {
    console.error('Distance calculation error:', error);
    res.status(500).json({
      error: 'Failed to calculate distance',
      message: error.message
    });
  }
});

/**
 * GET /api/airports/search
 * Search airports by name
 * Query params: ?q=kennedy&limit=5
 */
router.get('/search', (req, res) => {
  try {
    const { q, limit } = req.query;
    
    if (!q) {
      return res.status(400).json({
        error: 'Search query is required',
        example: '/api/airports/search?q=kennedy&limit=5'
      });
    }

    if (q.length < 2) {
      return res.status(400).json({
        error: 'Search query must be at least 2 characters long'
      });
    }

    const maxLimit = Math.min(parseInt(limit) || 10, 50);
    const results = airportService.searchByName(q, maxLimit);
    
    res.json({
      success: true,
      query: q,
      total_results: results.length,
      airports: results
    });
  } catch (error) {
    console.error('Airport search error:', error);
    res.status(500).json({
      error: 'Failed to search airports',
      message: error.message
    });
  }
});

/**
 * GET /api/airports/nearby
 * Find airports near a location
 * Query params: ?lat=40.6413&lon=-73.7781&radius=50&limit=10
 */
router.get('/nearby', (req, res) => {
  try {
    const { lat, lon, radius, limit } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Latitude and longitude are required',
        example: '/api/airports/nearby?lat=40.6413&lon=-73.7781&radius=50&limit=10'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const searchRadius = parseFloat(radius) || 50; // Default 50km
    const maxLimit = Math.min(parseInt(limit) || 10, 100);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: 'Invalid latitude or longitude values'
      });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        error: 'Latitude must be between -90 and 90, longitude between -180 and 180'
      });
    }

    const nearby = airportService.findNearby(latitude, longitude, searchRadius, maxLimit);
    
    res.json({
      success: true,
      center: { lat: latitude, lon: longitude },
      radius_km: searchRadius,
      total_found: nearby.length,
      airports: nearby
    });
  } catch (error) {
    console.error('Nearby airports error:', error);
    res.status(500).json({
      error: 'Failed to find nearby airports',
      message: error.message
    });
  }
});

/**
 * GET /api/airports/stats
 * Get airport database statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = airportService.getStats();
    
    res.json({
      success: true,
      database_stats: stats,
      endpoints: {
        lookup: '/api/airports/lookup/{code}',
        coordinates: '/api/airports/coordinates/{code}',
        route_coordinates: '/api/airports/route-coordinates [POST]',
        distance: '/api/airports/distance/{from}/{to}',
        search: '/api/airports/search?q={query}',
        nearby: '/api/airports/nearby?lat={lat}&lon={lon}&radius={km}'
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: 'Failed to get database statistics',
      message: error.message
    });
  }
});

module.exports = router;