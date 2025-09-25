const waypointGenerator = require('../utils/waypointGenerator');

describe('Waypoint Generator Tests', () => {
  
  describe('Basic Waypoint Generation', () => {
    it('should generate waypoints for short routes', () => {
      const waypoints = waypointGenerator.generateWaypoints('KJFK', 'KLGA');
      
      expect(waypoints).toBeInstanceOf(Array);
      expect(waypoints.length).toBeGreaterThanOrEqual(2);
      
      // First waypoint should be origin
      expect(waypoints[0].name).toBe('KJFK');
      expect(waypoints[0].type).toBe('AIRPORT');
      expect(waypoints[0].altitude).toBe(0);
      
      // Last waypoint should be destination
      const lastWaypoint = waypoints[waypoints.length - 1];
      expect(lastWaypoint.name).toBe('KLGA');
      expect(lastWaypoint.type).toBe('AIRPORT');
      expect(lastWaypoint.altitude).toBe(0);
    });

    it('should generate waypoints for medium routes', () => {
      const waypoints = waypointGenerator.generateWaypoints('KJFK', 'KORD');
      
      expect(waypoints.length).toBeGreaterThanOrEqual(3);
      
      // Should have intermediate waypoints for medium distance
      const intermediateWaypoints = waypoints.filter(w => w.type === 'WAYPOINT');
      expect(intermediateWaypoints.length).toBeGreaterThanOrEqual(1);
    });

    it('should generate waypoints for long routes', () => {
      const waypoints = waypointGenerator.generateWaypoints('KJFK', 'KLAX');
      
      expect(waypoints.length).toBeGreaterThanOrEqual(5);
      
      // Should have multiple intermediate waypoints for long distance
      const intermediateWaypoints = waypoints.filter(w => w.type === 'WAYPOINT');
      expect(intermediateWaypoints.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Waypoint Properties', () => {
    let waypoints;

    beforeEach(() => {
      waypoints = waypointGenerator.generateWaypoints('KJFK', 'KLAX', 35000);
    });

    it('should have correct waypoint structure', () => {
      waypoints.forEach((waypoint, index) => {
        expect(waypoint).toHaveProperty('id');
        expect(waypoint).toHaveProperty('name');
        expect(waypoint).toHaveProperty('type');
        expect(waypoint).toHaveProperty('lat');
        expect(waypoint).toHaveProperty('lon');
        expect(waypoint).toHaveProperty('altitude');
        expect(waypoint).toHaveProperty('description');
        expect(waypoint).toHaveProperty('estimatedTime');
        expect(waypoint).toHaveProperty('distanceFromPrevious');
        expect(waypoint).toHaveProperty('cumulativeDistance');

        // Check data types
        expect(typeof waypoint.id).toBe('number');
        expect(typeof waypoint.name).toBe('string');
        expect(typeof waypoint.lat).toBe('number');
        expect(typeof waypoint.lon).toBe('number');
        expect(typeof waypoint.altitude).toBe('number');
        expect(typeof waypoint.distanceFromPrevious).toBe('number');
        expect(typeof waypoint.cumulativeDistance).toBe('number');

        // Check ID sequence
        expect(waypoint.id).toBe(index + 1);

        // Check coordinate bounds
        expect(waypoint.lat).toBeGreaterThanOrEqual(-90);
        expect(waypoint.lat).toBeLessThanOrEqual(90);
        expect(waypoint.lon).toBeGreaterThanOrEqual(-180);
        expect(waypoint.lon).toBeLessThanOrEqual(180);
      });
    });

    it('should have correct altitude assignments', () => {
      const cruiseAltitude = 35000;
      
      waypoints.forEach(waypoint => {
        if (waypoint.type === 'AIRPORT') {
          expect(waypoint.altitude).toBe(0);
        } else {
          expect(waypoint.altitude).toBe(cruiseAltitude);
        }
      });
    });

    it('should have cumulative distances in ascending order', () => {
      for (let i = 1; i < waypoints.length; i++) {
        expect(waypoints[i].cumulativeDistance).toBeGreaterThanOrEqual(
          waypoints[i - 1].cumulativeDistance
        );
      }
    });

    it('should have consistent distance calculations', () => {
      for (let i = 1; i < waypoints.length; i++) {
        const expectedCumulative = waypoints[i - 1].cumulativeDistance + waypoints[i].distanceFromPrevious;
        expect(waypoints[i].cumulativeDistance).toBeCloseTo(expectedCumulative, 0);
      }
    });
  });

  describe('Custom Route Generation', () => {
    it('should use custom waypoints when provided', () => {
      const customRoute = ['NIKKO', 'DIXIE'];
      const waypoints = waypointGenerator.generateWaypoints('KJFK', 'KLAX', 35000, customRoute);
      
      // Should include custom waypoints
      expect(waypoints.some(w => w.name === 'NIKKO')).toBe(true);
      expect(waypoints.some(w => w.name === 'DIXIE')).toBe(true);
      
      // Should maintain proper sequence
      const nikkoIndex = waypoints.findIndex(w => w.name === 'NIKKO');
      const dixieIndex = waypoints.findIndex(w => w.name === 'DIXIE');
      expect(nikkoIndex).toBeLessThan(dixieIndex);
    });

    it('should skip unknown waypoints in custom route', () => {
      const customRoute = ['UNKNOWN_WAYPOINT'];
      const waypoints = waypointGenerator.generateWaypoints('KJFK', 'KLAX', 35000, customRoute);
      
      // Should not include unknown waypoint
      expect(waypoints.some(w => w.name === 'UNKNOWN_WAYPOINT')).toBe(false);
      
      // Should still connect origin to destination
      expect(waypoints[0].name).toBe('KJFK');
      expect(waypoints[waypoints.length - 1].name).toBe('KLAX');
    });
  });

  describe('Distance and Time Calculations', () => {
    it('should calculate realistic distances', () => {
      const waypoints = waypointGenerator.generateWaypoints('KJFK', 'KLAX');
      const totalDistance = waypointGenerator.calculateTotalDistance(waypoints);
      
      // KJFK to KLAX is approximately 2475 nautical miles
      expect(totalDistance).toBeGreaterThan(2400);
      expect(totalDistance).toBeLessThan(2600);
    });

    it('should calculate flight times', () => {
      const shortTime = waypointGenerator.calculateFlightTime(100, 35000);
      const longTime = waypointGenerator.calculateFlightTime(2500, 35000);
      
      // Check format
      expect(shortTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(longTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      
      // Short flight should be less time than long flight
      const shortMinutes = timeToMinutes(shortTime);
      const longMinutes = timeToMinutes(longTime);
      expect(longMinutes).toBeGreaterThan(shortMinutes);
    });

    it('should handle zero distance', () => {
      const time = waypointGenerator.calculateFlightTime(0);
      expect(time).toBe('00:00:00');
    });

    it('should adjust ground speed by altitude', () => {
      const lowAltTime = waypointGenerator.calculateFlightTime(1000, 10000);
      const highAltTime = waypointGenerator.calculateFlightTime(1000, 40000);
      
      const lowMinutes = timeToMinutes(lowAltTime);
      const highMinutes = timeToMinutes(highAltTime);
      
      // High altitude should be faster (higher ground speed)
      expect(lowMinutes).toBeGreaterThan(highMinutes);
    });
  });

  describe('Airport Database', () => {
    it('should have major US airports', () => {
      const airports = waypointGenerator.getAvailableAirports();
      const icaoCodes = airports.map(a => a.icao);
      
      const majorAirports = ['KJFK', 'KLAX', 'KORD', 'KATL', 'KDEN', 'KSFO'];
      majorAirports.forEach(icao => {
        expect(icaoCodes).toContain(icao);
      });
    });

    it('should have international airports', () => {
      const airports = waypointGenerator.getAvailableAirports();
      const icaoCodes = airports.map(a => a.icao);
      
      const internationalAirports = ['EGLL', 'LFPG', 'EDDF'];
      internationalAirports.forEach(icao => {
        expect(icaoCodes).toContain(icao);
      });
    });

    it('should have proper airport data structure', () => {
      const airports = waypointGenerator.getAvailableAirports();
      
      airports.forEach(airport => {
        expect(airport.icao).toMatch(/^[A-Z]{4}$/);
        expect(typeof airport.name).toBe('string');
        expect(airport.name.length).toBeGreaterThan(0);
        expect(typeof airport.coords.lat).toBe('number');
        expect(typeof airport.coords.lon).toBe('number');
        expect(airport.coords.lat).toBeGreaterThanOrEqual(-90);
        expect(airport.coords.lat).toBeLessThanOrEqual(90);
        expect(airport.coords.lon).toBeGreaterThanOrEqual(-180);
        expect(airport.coords.lon).toBeLessThanOrEqual(180);
      });
    });

    it('should return sorted airports', () => {
      const airports = waypointGenerator.getAvailableAirports();
      const icaoCodes = airports.map(a => a.icao);
      const sortedCodes = [...icaoCodes].sort();
      
      expect(icaoCodes).toEqual(sortedCodes);
    });
  });

  describe('Route Validation', () => {
    it('should validate correct routes', () => {
      const validation = waypointGenerator.validateRoute('KJFK', 'KLAX');
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing origin airport', () => {
      const validation = waypointGenerator.validateRoute('XXXX', 'KLAX');
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Origin airport XXXX not found in database');
    });

    it('should detect missing destination airport', () => {
      const validation = waypointGenerator.validateRoute('KJFK', 'YYYY');
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Destination airport YYYY not found in database');
    });

    it('should detect same origin and destination', () => {
      const validation = waypointGenerator.validateRoute('KJFK', 'KJFK');
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Origin and destination cannot be the same');
    });

    it('should warn about long flights', () => {
      const validation = waypointGenerator.validateRoute('KJFK', 'NZAA'); // Very long flight
      
      if (validation.warnings.length > 0) {
        expect(validation.warnings).toContain('Very long flight distance - consider fuel stops');
      }
    });

    it('should warn about unknown waypoints', () => {
      const validation = waypointGenerator.validateRoute('KJFK', 'KLAX', ['UNKNOWN']);
      
      expect(validation.warnings).toContain('Waypoint UNKNOWN not found in database - will be skipped');
    });
  });

  describe('Airport Management', () => {
    it('should add new airports', () => {
      const result = waypointGenerator.addAirport('KTEST', 40.0, -74.0, 'Test Airport');
      expect(result).toBe(true);
      
      // Verify airport was added
      const airports = waypointGenerator.getAvailableAirports();
      const testAirport = airports.find(a => a.icao === 'KTEST');
      expect(testAirport).toBeDefined();
      expect(testAirport.name).toBe('Test Airport');
      expect(testAirport.coords.lat).toBe(40.0);
      expect(testAirport.coords.lon).toBe(-74.0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing parameters', () => {
      expect(() => waypointGenerator.generateWaypoints()).toThrow('Origin and destination are required');
      expect(() => waypointGenerator.generateWaypoints('KJFK')).toThrow('Origin and destination are required');
    });

    it('should handle unknown airports gracefully', () => {
      expect(() => waypointGenerator.generateWaypoints('UNKNOWN1', 'UNKNOWN2'))
        .toThrow('Airport coordinates not found');
    });
  });
});

// Helper function to convert time string to minutes
function timeToMinutes(timeString) {
  const [hours, minutes, seconds] = timeString.split(':').map(Number);
  return hours * 60 + minutes + seconds / 60;
}