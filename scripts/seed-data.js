/**
 * Aviation Weather Briefing - Seed Data Generator
 * Populates the system with sample aviation data for testing and development
 */

// Sample Airport Data
const sampleAirports = [
  {
    icao: 'KJFK',
    name: 'John F. Kennedy International Airport',
    city: 'New York',
    country: 'United States',
    lat: 40.6413,
    lon: -73.7781,
    elevation: 13,
    timezone: 'America/New_York'
  },
  {
    icao: 'KSFO',
    name: 'San Francisco International Airport',
    city: 'San Francisco',
    country: 'United States',
    lat: 37.6213,
    lon: -122.3790,
    elevation: 13,
    timezone: 'America/Los_Angeles'
  },
  {
    icao: 'KORD',
    name: 'Chicago O\'Hare International Airport',
    city: 'Chicago',
    country: 'United States',
    lat: 41.9742,
    lon: -87.9073,
    elevation: 672,
    timezone: 'America/Chicago'
  },
  {
    icao: 'KDEN',
    name: 'Denver International Airport',
    city: 'Denver',
    country: 'United States',
    lat: 39.8561,
    lon: -104.6737,
    elevation: 5431,
    timezone: 'America/Denver'
  },
  {
    icao: 'KLAX',
    name: 'Los Angeles International Airport',
    city: 'Los Angeles',
    country: 'United States',
    lat: 33.9425,
    lon: -118.4081,
    elevation: 125,
    timezone: 'America/Los_Angeles'
  }
];

// Sample METAR Data
const sampleMetarData = [
  {
    icao: 'KJFK',
    metar: 'KJFK 251651Z 24016G24KT 10SM BKN250 22/13 A3000 RMK AO2 SLP157 T02220128',
    decoded: {
      station: 'KJFK',
      time: '251651Z',
      wind: { direction: 240, speed: 16, gusts: 24, unit: 'KT' },
      visibility: { distance: 10, unit: 'SM' },
      clouds: [{ type: 'BKN', altitude: 25000 }],
      temperature: 22,
      dewpoint: 13,
      altimeter: { value: 30.00, unit: 'inHg' },
      conditions: 'Partly Cloudy'
    },
    severity: 'LOW'
  },
  {
    icao: 'KSFO',
    metar: 'KSFO 251651Z 28008KT 10SM FEW200 18/12 A3015 RMK AO2 SLP218 T01780122',
    decoded: {
      station: 'KSFO',
      time: '251651Z',
      wind: { direction: 280, speed: 8, unit: 'KT' },
      visibility: { distance: 10, unit: 'SM' },
      clouds: [{ type: 'FEW', altitude: 20000 }],
      temperature: 18,
      dewpoint: 12,
      altimeter: { value: 30.15, unit: 'inHg' },
      conditions: 'Clear'
    },
    severity: 'LOW'
  },
  {
    icao: 'KORD',
    metar: 'KORD 251651Z 09012KT 8SM -RA BKN015 OVC030 15/13 A2995 RMK AO2 RAB25 SLP142',
    decoded: {
      station: 'KORD',
      time: '251651Z',
      wind: { direction: 90, speed: 12, unit: 'KT' },
      visibility: { distance: 8, unit: 'SM' },
      weather: [{ intensity: 'light', phenomenon: 'rain' }],
      clouds: [
        { type: 'BKN', altitude: 1500 },
        { type: 'OVC', altitude: 3000 }
      ],
      temperature: 15,
      dewpoint: 13,
      altimeter: { value: 29.95, unit: 'inHg' },
      conditions: 'Light Rain'
    },
    severity: 'MEDIUM'
  }
];

// Sample TAF Data
const sampleTafData = [
  {
    icao: 'KJFK',
    taf: 'TAF KJFK 251720Z 1818/1924 24015G25KT P6SM BKN200 FM182000 25012KT P6SM SCT250',
    periods: [
      {
        validFrom: '1818',
        validTo: '1924',
        wind: { direction: 240, speed: 15, gusts: 25 },
        visibility: 'P6SM',
        clouds: [{ type: 'BKN', altitude: 20000 }]
      }
    ]
  }
];

// Sample NOTAM Data
const sampleNotamData = [
  {
    id: 'A1234/23',
    icao: 'KJFK',
    text: 'A1234/23 KJFK AD AP RWY 04L/22R CLSD DUE CONST 2309261200-2309262359',
    category: 'RUNWAY',
    severity: 'HIGH',
    subject: 'Runway Closure',
    effectiveDate: '2023-09-26T12:00:00Z',
    expiryDate: '2023-09-26T23:59:00Z',
    description: 'Runway 04L/22R closed due to construction work',
    coordinates: null,
    altitudeAffected: null
  },
  {
    id: 'A5678/23',
    icao: 'KSFO',
    text: 'A5678/23 KSFO AD AP TWY A BTN TWY B AND TWY C CLSD 2309261800-2309270600',
    category: 'TAXIWAY',
    severity: 'MEDIUM',
    subject: 'Taxiway Closure',
    effectiveDate: '2023-09-26T18:00:00Z',
    expiryDate: '2023-09-27T06:00:00Z',
    description: 'Taxiway A closed between Taxiway B and C',
    coordinates: null,
    altitudeAffected: null
  },
  {
    id: 'A9012/23',
    icao: 'KORD',
    text: 'A9012/23 KORD AD AP ILS RWY 28L U/S 2309260800-2309271200',
    category: 'NAVIGATION',
    severity: 'HIGH',
    subject: 'ILS Out of Service',
    effectiveDate: '2023-09-26T08:00:00Z',
    expiryDate: '2023-09-27T12:00:00Z',
    description: 'ILS approach for Runway 28L is unserviceable',
    coordinates: null,
    altitudeAffected: null
  }
];

// Sample Flight Routes
const sampleFlightRoutes = [
  {
    id: 'route_1',
    origin: 'KJFK',
    destination: 'KSFO',
    waypoints: [
      { name: 'KJFK', lat: 40.6413, lon: -73.7781, type: 'departure' },
      { name: 'AVP', lat: 41.2619, lon: -75.8606, type: 'waypoint' },
      { name: 'CVG', lat: 39.0539, lon: -84.6621, type: 'waypoint' },
      { name: 'DEN', lat: 39.8561, lon: -104.6737, type: 'waypoint' },
      { name: 'KSFO', lat: 37.6213, lon: -122.3790, type: 'arrival' }
    ],
    distance: 2586,
    estimatedTime: '5h 30m',
    cruiseAltitude: 35000
  },
  {
    id: 'route_2',
    origin: 'KORD',
    destination: 'KLAX',
    waypoints: [
      { name: 'KORD', lat: 41.9742, lon: -87.9073, type: 'departure' },
      { name: 'DSM', lat: 41.5668, lon: -93.6631, type: 'waypoint' },
      { name: 'DEN', lat: 39.8561, lon: -104.6737, type: 'waypoint' },
      { name: 'LAS', lat: 36.0840, lon: -115.1537, type: 'waypoint' },
      { name: 'KLAX', lat: 33.9425, lon: -118.4081, type: 'arrival' }
    ],
    distance: 1745,
    estimatedTime: '3h 45m',
    cruiseAltitude: 32000
  }
];

// Sample SIGMET Data
const sampleSigmetData = [
  {
    id: 'SIGMET_001',
    hazard: 'THUNDERSTORM',
    intensity: 'MODERATE',
    coordinates: [
      [-95.0, 35.0], [-90.0, 35.0], [-90.0, 40.0], [-95.0, 40.0], [-95.0, 35.0]
    ],
    altitude: { bottom: 10000, top: 45000 },
    movement: { direction: 'NE', speed: 15 },
    validFrom: '2023-09-26T12:00:00Z',
    validTo: '2023-09-26T18:00:00Z',
    description: 'Moderate thunderstorms moving northeast at 15 knots'
  },
  {
    id: 'SIGMET_002',
    hazard: 'TURBULENCE',
    intensity: 'SEVERE',
    coordinates: [
      [-110.0, 38.0], [-105.0, 38.0], [-105.0, 42.0], [-110.0, 42.0], [-110.0, 38.0]
    ],
    altitude: { bottom: 25000, top: 40000 },
    movement: { direction: 'E', speed: 10 },
    validFrom: '2023-09-26T10:00:00Z',
    validTo: '2023-09-26T16:00:00Z',
    description: 'Severe turbulence in mountainous terrain'
  }
];

// Sample Aircraft Types
const sampleAircraftTypes = [
  { code: 'C152', name: 'Cessna 152', category: 'Light Single Engine', cruiseSpeed: 95 },
  { code: 'C172', name: 'Cessna 172', category: 'Light Single Engine', cruiseSpeed: 122 },
  { code: 'C182', name: 'Cessna 182', category: 'Light Single Engine', cruiseSpeed: 145 },
  { code: 'PA28', name: 'Piper Cherokee', category: 'Light Single Engine', cruiseSpeed: 125 },
  { code: 'B737', name: 'Boeing 737', category: 'Commercial Jet', cruiseSpeed: 514 },
  { code: 'A320', name: 'Airbus A320', category: 'Commercial Jet', cruiseSpeed: 511 }
];

// Export all sample data
const seedData = {
  airports: sampleAirports,
  metar: sampleMetarData,
  taf: sampleTafData,
  notams: sampleNotamData,
  routes: sampleFlightRoutes,
  sigmets: sampleSigmetData,
  aircraftTypes: sampleAircraftTypes
};

// Function to seed database (if using a database)
async function seedDatabase() {
  console.log('🌱 Starting aviation weather data seeding...');
  
  try {
    // If you have a database connection, seed it here
    // Example:
    // await Airport.insertMany(sampleAirports);
    // await WeatherData.insertMany(sampleMetarData);
    // await NotamData.insertMany(sampleNotamData);
    
    console.log('✅ Successfully seeded:');
    console.log(`   📍 ${sampleAirports.length} airports`);
    console.log(`   🌤️  ${sampleMetarData.length} METAR reports`);
    console.log(`   📋 ${sampleNotamData.length} NOTAMs`);
    console.log(`   ✈️  ${sampleFlightRoutes.length} flight routes`);
    console.log(`   ⚠️  ${sampleSigmetData.length} SIGMETs`);
    console.log(`   🛩️  ${sampleAircraftTypes.length} aircraft types`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Function to generate API test data
function generateApiTestData() {
  console.log('🧪 Generating API test data...');
  
  const testRequests = {
    flightPlanRequest: {
      origin: 'KJFK',
      destination: 'KSFO',
      altitude: 35000,
      aircraftType: 'B737',
      departureTime: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    },
    weatherRequest: {
      metarString: sampleMetarData[0].metar,
      icao: 'KJFK'
    },
    notamRequest: {
      notamText: sampleNotamData[0].text,
      icao: 'KJFK'
    },
    summarizeRequest: {
      notamText: sampleNotamData.map(n => n.text).join(' | '),
      weatherData: sampleMetarData[0],
      icao: 'KJFK'
    }
  };
  
  return testRequests;
}

// Function to create mock responses for development
function createMockResponses() {
  return {
    flightPlanResponse: {
      success: true,
      waypoints: sampleFlightRoutes[0].waypoints,
      distance: sampleFlightRoutes[0].distance,
      estimatedTime: sampleFlightRoutes[0].estimatedTime
    },
    weatherResponse: {
      success: true,
      weather: sampleMetarData,
      sigmets: sampleSigmetData
    },
    notamResponse: {
      success: true,
      notams: sampleNotamData
    }
  };
}

// CLI execution
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'seed':
      seedDatabase();
      break;
    case 'test-data':
      console.log('🧪 API Test Data:');
      console.log(JSON.stringify(generateApiTestData(), null, 2));
      break;
    case 'mock-responses':
      console.log('🎭 Mock API Responses:');
      console.log(JSON.stringify(createMockResponses(), null, 2));
      break;
    default:
      console.log(`
📊 Aviation Weather Briefing - Seed Data Generator

Usage:
  node seed-data.js seed           # Seed database with sample data
  node seed-data.js test-data      # Generate API test requests
  node seed-data.js mock-responses # Generate mock API responses

Available sample data:
  • ${sampleAirports.length} airports (major US hubs)
  • ${sampleMetarData.length} METAR weather reports
  • ${sampleNotamData.length} NOTAMs (runway, taxiway, navigation)
  • ${sampleFlightRoutes.length} flight routes with waypoints
  • ${sampleSigmetData.length} SIGMETs (thunderstorms, turbulence)
  • ${sampleAircraftTypes.length} aircraft types
      `);
  }
}

// Export for use in other modules
module.exports = seedData;
