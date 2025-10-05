const request = require('supertest');
const app = require('../server');

// Global test setup and teardown
let server;

beforeAll(() => {
  // Start server for testing
  server = app.listen(0); // Use port 0 for random available port
});

afterAll(async () => {
  // Clean up server and connections
  if (server) {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }
  
  // Force exit any remaining handles
  await new Promise(resolve => setTimeout(resolve, 100));
});

describe('Flight Plan API Tests', () => {
  
  describe('POST /api/flightplan/generate', () => {
    it('should generate flight plan with waypoints', async () => {
      const flightData = {
        origin: 'KJFK',
        destination: 'KLAX',
        altitude: 35000
      };
      
      const response = await request(app)
        .post('/api/flightplan/generate')
        .send(flightData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.parsed.origin).toBe('KJFK');
      expect(response.body.parsed.destination).toBe('KLAX');
      expect(response.body.parsed.altitude).toBe(35000);
      expect(response.body.parsed.waypoints).toBeInstanceOf(Array);
      expect(response.body.flightPlan.waypoints.length).toBeGreaterThan(1);
      expect(response.body.flightPlan.distance).toBeGreaterThan(0);
    });

    it('should return error for missing origin', async () => {
      const response = await request(app)
        .post('/api/flightplan/generate')
        .send({ destination: 'KLAX' })
        .expect(400);

      expect(response.body.error).toBe('Missing required parameters');
      expect(response.body.required).toContain('origin');
    });

    it('should return error for missing destination', async () => {
      const response = await request(app)
        .post('/api/flightplan/generate')
        .send({ origin: 'KJFK' })
        .expect(400);

      expect(response.body.error).toBe('Missing required parameters');
      expect(response.body.required).toContain('destination');
    });
  });

  describe('POST /api/flightplan/briefing', () => {
    it('should generate route briefing', async () => {
      const waypoints = [
        { name: 'KJFK', lat: 40.6413, lon: -73.7781 },
        { name: 'KLAX', lat: 33.9425, lon: -118.4081 }
      ];
      
      const response = await request(app)
        .post('/api/flightplan/briefing')
        .send({ waypoints })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.briefing.summary).toBeDefined();
      expect(response.body.briefing.overallSeverity).toBeDefined();
      expect(response.body.briefing.weatherBySegment).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/flightplan/analyze', () => {
    it('should analyze flight plan safety', async () => {
      const flightPlan = {
        waypoints: [
          {
            name: 'KJFK',
            lat: 40.6413,
            lon: -73.7781,
            severity: 'CLEAR',
            weather: { visibility: { distance: 10 }, wind: { speed: 10 } }
          },
          {
            name: 'KLAX',
            lat: 33.9425,
            lon: -118.4081,
            severity: 'SIGNIFICANT',
            weather: { visibility: { distance: 4 }, wind: { speed: 20 } }
          }
        ]
      };
      
      const response = await request(app)
        .post('/api/flightplan/analyze')
        .send({ flightPlan })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.analysis.overallRisk).toBeDefined();
      expect(response.body.analysis.safetyScore).toBeGreaterThanOrEqual(0);
      expect(response.body.analysis.safetyScore).toBeLessThanOrEqual(100);
      expect(response.body.analysis.recommendations).toBeInstanceOf(Array);
    });
  });
});

describe('Waypoint Generator Unit Tests', () => {
  const waypointGenerator = require('../utils/waypointGenerator');

  it('should generate waypoints between airports', async () => {
    const waypoints = await waypointGenerator.generateWaypoints('KJFK', 'KLAX');
    
    expect(waypoints).toBeInstanceOf(Array);
    expect(waypoints.length).toBeGreaterThanOrEqual(2);
    expect(waypoints[0].name).toBe('KJFK');
    expect(waypoints[waypoints.length - 1].name).toBe('KLAX');
    
    // Check waypoint structure
    waypoints.forEach(waypoint => {
      expect(waypoint).toHaveProperty('id');
      expect(waypoint).toHaveProperty('name');
      expect(waypoint).toHaveProperty('lat');
      expect(waypoint).toHaveProperty('lon');
      expect(waypoint).toHaveProperty('altitude');
      expect(waypoint).toHaveProperty('distanceFromPrevious');
      expect(waypoint).toHaveProperty('cumulativeDistance');
    });
  });

  it('should calculate total distance', async () => {
    const waypoints = await waypointGenerator.generateWaypoints('KJFK', 'KLAX');
    const totalDistance = waypointGenerator.calculateTotalDistance(waypoints);
    
    expect(totalDistance).toBeGreaterThan(2000); // KJFK to KLAX is about 2475 NM
    expect(totalDistance).toBeLessThan(3000);
  });

  it('should calculate flight time', () => {
    const flightTime = waypointGenerator.calculateFlightTime(2475, 35000);
    
    expect(flightTime).toMatch(/^\d{2}:\d{2}:\d{2}$/); // HH:MM:SS format
    expect(flightTime).not.toBe('00:00:00');
  });

  it('should validate flight routes', () => {
    const validRoute = waypointGenerator.validateRoute('KJFK', 'KLAX');
    expect(validRoute.valid).toBe(true);
    expect(validRoute.errors).toHaveLength(0);

    const invalidRoute = waypointGenerator.validateRoute('INVALID', 'KLAX');
    expect(invalidRoute.valid).toBe(false);
    expect(invalidRoute.errors.length).toBeGreaterThan(0);

    const sameAirport = waypointGenerator.validateRoute('KJFK', 'KJFK');
    expect(sameAirport.valid).toBe(false);
    expect(sameAirport.errors).toContain('Origin and destination cannot be the same');
  });

  it('should get available airports', () => {
    const airports = waypointGenerator.getAvailableAirports();
    
    expect(airports).toBeInstanceOf(Array);
    expect(airports.length).toBeGreaterThan(0);
    
    airports.forEach(airport => {
      expect(airport).toHaveProperty('icao');
      expect(airport).toHaveProperty('name');
      expect(airport).toHaveProperty('coords');
      expect(airport.coords).toHaveProperty('lat');
      expect(airport.coords).toHaveProperty('lon');
    });

    // Check if KJFK is in the list
    const kjfk = airports.find(a => a.icao === 'KJFK');
    expect(kjfk).toBeDefined();
    expect(kjfk.name).toContain('Kennedy');
  });

  it('should handle custom route waypoints', async () => {
    const customRoute = ['NIKKO', 'DIXIE'];
    const waypoints = await waypointGenerator.generateWaypoints('KJFK', 'KLAX', 35000, customRoute);
    
    expect(waypoints.length).toBeGreaterThanOrEqual(4); // Origin + custom waypoints + destination
    expect(waypoints.some(w => w.name === 'NIKKO')).toBe(true);
    expect(waypoints.some(w => w.name === 'DIXIE')).toBe(true);
  });

  it('should calculate distance between coordinates', () => {
    // Distance between KJFK and KLAX
    const distance = waypointGenerator.calculateDistance(40.6413, -73.7781, 33.9425, -118.4081);
    
    expect(distance).toBeGreaterThan(2100);
    expect(distance).toBeLessThan(2200);
  });
});

describe('API Fetcher Unit Tests', () => {
  const apiFetcher = require('../utils/apiFetcher');

  it('should generate mock METAR data', () => {
    const mockMetar = apiFetcher.generateMockMetar('KJFK');
    
    expect(mockMetar).toHaveProperty('raw');
    expect(mockMetar).toHaveProperty('observationTime');
    expect(mockMetar).toHaveProperty('station');
    expect(mockMetar.station).toBe('KJFK');
    expect(mockMetar.raw).toContain('KJFK');
  });

  it('should generate mock TAF data', () => {
    const mockTaf = apiFetcher.generateMockTaf('KJFK');
    
    expect(mockTaf).toHaveProperty('raw');
    expect(mockTaf).toHaveProperty('issueTime');
    expect(mockTaf).toHaveProperty('station');
    expect(mockTaf.station).toBe('KJFK');
    expect(mockTaf.raw).toContain('TAF KJFK');
  });

  it('should find nearest airport', async () => {
    // Coordinates near KJFK
    const nearestAirport = await apiFetcher.findNearestAirport(40.6, -73.8);
    expect(nearestAirport).toBe('KJFK');
  });

  it('should calculate distance between coordinates', () => {
    const distance = apiFetcher.calculateDistance(40.6413, -73.7781, 40.7769, -73.8740);
    expect(distance).toBeGreaterThan(9);
    expect(distance).toBeLessThan(10);
  });
});

describe('Integration Tests', () => {
  it('should generate complete flight plan with weather analysis', async () => {
    const flightData = {
      origin: 'KJFK',
      destination: 'KBOS',
      altitude: 35000
    };
    
    // Generate flight plan
    const planResponse = await request(app)
      .post('/api/flightplan/generate')
      .send(flightData)
      .expect(200);

    expect(planResponse.body.success).toBe(true);
    const flightPlan = planResponse.body.flightPlan;

    // Analyze safety
    const analysisResponse = await request(app)
      .post('/api/flightplan/analyze')
      .send({ flightPlan })
      .expect(200);

    expect(analysisResponse.body.success).toBe(true);
    expect(analysisResponse.body.analysis.overallRisk).toBeDefined();
  }, 10000); // Extended timeout for integration test
});