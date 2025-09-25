const request = require('supertest');
const app = require('../server');

describe('Weather API Tests', () => {
  
  describe('POST /api/weather/metar', () => {
    it('should decode valid METAR data', async () => {
      const metarString = 'KJFK 121851Z 24016G24KT 10SM BKN250 22/13 A3000 RMK AO2';
      
      const response = await request(app)
        .post('/api/weather/metar')
        .send({ metarString })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.decoded.station).toBe('KJFK');
      expect(response.body.decoded.wind.speed).toBe(16);
      expect(response.body.decoded.wind.gust).toBe(24);
      expect(response.body.humanReadable).toBeDefined();
    });

    it('should return error for missing METAR string', async () => {
      const response = await request(app)
        .post('/api/weather/metar')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('METAR string is required');
    });
  });

  describe('POST /api/weather/taf', () => {
    it('should decode valid TAF data', async () => {
      const tafString = 'TAF KJFK 121720Z 1218/1324 24015G25KT P6SM BKN200';
      
      const response = await request(app)
        .post('/api/weather/taf')
        .send({ tafString })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.decoded.station).toBe('KJFK');
      expect(response.body.decoded.periods).toBeInstanceOf(Array);
      expect(response.body.humanReadable).toBeDefined();
    });
  });

  describe('GET /api/weather/current/:icao', () => {
    it('should fetch current weather for valid airport', async () => {
      const response = await request(app)
        .get('/api/weather/current/KJFK')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.airport).toBe('KJFK');
      expect(response.body.current).toBeDefined();
    });

    it('should return error for invalid ICAO code', async () => {
      const response = await request(app)
        .get('/api/weather/current/INVALID')
        .expect(400);

      expect(response.body.error).toContain('Valid 4-letter ICAO airport code is required');
    });
  });

  describe('POST /api/weather/briefing', () => {
    it('should generate weather briefing for multiple airports', async () => {
      const airports = ['KJFK', 'KLGA', 'KEWR'];
      
      const response = await request(app)
        .post('/api/weather/briefing')
        .send({ airports })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.briefing.airports).toHaveLength(3);
      expect(response.body.briefing.summary).toBeDefined();
      expect(response.body.briefing.overallConditions).toBeDefined();
    });
  });
});

describe('METAR Decoder Unit Tests', () => {
  const metarDecoder = require('../utils/metarDecoder');

  it('should decode basic METAR elements', () => {
    const metar = 'KJFK 121851Z 24016G24KT 10SM CLR 22/13 A3000 RMK AO2';
    const decoded = metarDecoder.decode(metar);

    expect(decoded.station).toBe('KJFK');
    expect(decoded.wind.direction).toBe(240);
    expect(decoded.wind.speed).toBe(16);
    expect(decoded.wind.gust).toBe(24);
    expect(decoded.visibility.distance).toBe(10);
    expect(decoded.temperature).toBe(22);
    expect(decoded.dewpoint).toBe(13);
    expect(decoded.pressure.altimeter).toBe(30.00);
  });

  it('should handle variable wind', () => {
    const metar = 'KJFK 121851Z VRB05KT 10SM CLR 22/13 A3000';
    const decoded = metarDecoder.decode(metar);

    expect(decoded.wind.direction).toBe('VRB');
    expect(decoded.wind.speed).toBe(5);
    expect(decoded.wind.variable).toBe(true);
  });

  it('should convert to human readable format', () => {
    const metar = 'KJFK 121851Z 24016KT 10SM CLR 22/13 A3000';
    const decoded = metarDecoder.decode(metar);
    const readable = metarDecoder.toHumanReadable(decoded);

    expect(readable.station).toBe('KJFK');
    expect(readable.conditions).toBeInstanceOf(Array);
    expect(readable.summary).toContain('Wind 240°');
    expect(readable.summary).toContain('16 knots');
  });
});

describe('Severity Classifier Unit Tests', () => {
  const severityClassifier = require('../utils/severityClassifier');

  it('should classify clear conditions', () => {
    const weatherData = {
      visibility: { distance: 10 },
      wind: { speed: 10 },
      clouds: [{ coverage: 'few', altitude: 5000 }],
      weather: []
    };

    const severity = severityClassifier.classifyWeatherConditions(weatherData);
    expect(severity).toBe('CLEAR');
  });

  it('should classify significant conditions', () => {
    const weatherData = {
      visibility: { distance: 4 },
      wind: { speed: 18 },
      clouds: [{ coverage: 'broken', altitude: 2000 }],
      weather: [{ raw: 'RA', description: 'moderate rain' }]
    };

    const severity = severityClassifier.classifyWeatherConditions(weatherData);
    expect(severity).toBe('SIGNIFICANT');
  });

  it('should classify severe conditions', () => {
    const weatherData = {
      visibility: { distance: 1 },
      wind: { speed: 30, gust: 40 },
      clouds: [{ coverage: 'overcast', altitude: 500 }],
      weather: [{ raw: 'TS', description: 'thunderstorm' }]
    };

    const severity = severityClassifier.classifyWeatherConditions(weatherData);
    expect(severity).toBe('SEVERE');
  });
});