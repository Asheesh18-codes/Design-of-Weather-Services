/**
 * Aviation Weather Services - Interactive Demo
 * Demonstrates all weather parameters including METAR, TAF, NOTAM, and flight planning
 */

const seedData = require('./seed-data');
const fs = require('fs');
const path = require('path');

class AviationWeatherDemo {
  constructor() {
    this.data = seedData;
    this.selectedAirport = null;
  }

  // Display formatted header
  displayHeader() {
    console.log('\n' + '='.repeat(80));
    console.log('🛩️  AVIATION WEATHER SERVICES DEMO');
    console.log('   Comprehensive Weather Briefing System');
    console.log('='.repeat(80));
    console.log(`📅 Demo Date: ${new Date().toLocaleDateString()}`);
    console.log(`⏰ Demo Time: ${new Date().toLocaleTimeString()}`);
    console.log('='.repeat(80) + '\n');
  }

  // Display all available airports
  displayAirports() {
    console.log('📍 AVAILABLE AIRPORTS:');
    console.log('-'.repeat(50));
    this.data.airports.forEach((airport, index) => {
      console.log(`${index + 1}. ${airport.icao} - ${airport.name}`);
      console.log(`   📍 ${airport.city}, ${airport.country}`);
      console.log(`   🧭 Coordinates: ${airport.lat}°N, ${Math.abs(airport.lon)}°W`);
      console.log(`   ⛰️  Elevation: ${airport.elevation} ft`);
      console.log(`   🕐 Timezone: ${airport.timezone}\n`);
    });
  }

  // Display METAR data for all airports
  displayMETAR() {
    console.log('🌤️  METAR WEATHER REPORTS:');
    console.log('='.repeat(60));
    
    this.data.metar.forEach(metarData => {
      const airport = this.data.airports.find(a => a.icao === metarData.icao);
      console.log(`\n📍 Station: ${metarData.icao} - ${airport?.name || 'Unknown Airport'}`);
      console.log(`📡 Raw METAR: ${metarData.metar}`);
      console.log('\n📊 DECODED DATA:');
      
      const decoded = metarData.decoded;
      console.log(`   ⏰ Observation Time: ${decoded.time}`);
      console.log(`   🌬️  Wind: ${decoded.wind.direction}° at ${decoded.wind.speed} KT${decoded.wind.gusts ? ` gusting to ${decoded.wind.gusts} KT` : ''}`);
      console.log(`   👁️  Visibility: ${decoded.visibility.distance} ${decoded.visibility.unit}`);
      
      if (decoded.weather) {
        console.log(`   🌧️  Weather: ${decoded.weather.map(w => `${w.intensity} ${w.phenomenon}`).join(', ')}`);
      }
      
      if (decoded.clouds && decoded.clouds.length > 0) {
        console.log(`   ☁️  Clouds:`);
        decoded.clouds.forEach(cloud => {
          console.log(`      ${cloud.type} at ${cloud.altitude} ft`);
        });
      }
      
      console.log(`   🌡️  Temperature: ${decoded.temperature}°C`);
      console.log(`   💧 Dewpoint: ${decoded.dewpoint}°C`);
      console.log(`   📏 Altimeter: ${decoded.altimeter.value} ${decoded.altimeter.unit}`);
      console.log(`   📋 Conditions: ${decoded.conditions}`);
      console.log(`   ⚠️  Severity: ${metarData.severity}`);
      console.log('-'.repeat(60));
    });
  }

  // Display TAF forecasts
  displayTAF() {
    console.log('\n📋 TAF FORECASTS:');
    console.log('='.repeat(60));
    
    this.data.taf.forEach(tafData => {
      const airport = this.data.airports.find(a => a.icao === tafData.icao);
      console.log(`\n📍 Station: ${tafData.icao} - ${airport?.name || 'Unknown Airport'}`);
      console.log(`📡 Raw TAF: ${tafData.taf}`);
      
      console.log('\n📊 FORECAST PERIODS:');
      tafData.periods.forEach((period, index) => {
        console.log(`   Period ${index + 1}:`);
        console.log(`   ⏰ Valid: ${period.validFrom}Z to ${period.validTo}Z`);
        console.log(`   🌬️  Wind: ${period.wind.direction}° at ${period.wind.speed} KT${period.wind.gusts ? ` gusting to ${period.wind.gusts} KT` : ''}`);
        console.log(`   👁️  Visibility: ${period.visibility}`);
        
        if (period.clouds && period.clouds.length > 0) {
          console.log(`   ☁️  Clouds:`);
          period.clouds.forEach(cloud => {
            console.log(`      ${cloud.type} at ${cloud.altitude} ft`);
          });
        }
      });
      console.log('-'.repeat(60));
    });
  }

  // Display NOTAM information
  displayNOTAMs() {
    console.log('\n📢 NOTICE TO AIRMEN (NOTAMs):');
    console.log('='.repeat(80));
    
    this.data.notams.forEach(notam => {
      const airport = this.data.airports.find(a => a.icao === notam.icao);
      console.log(`\n📍 Airport: ${notam.icao} - ${airport?.name || 'Unknown Airport'}`);
      console.log(`🆔 NOTAM ID: ${notam.id}`);
      console.log(`📝 Subject: ${notam.subject}`);
      console.log(`📂 Category: ${notam.category}`);
      console.log(`⚠️  Severity: ${notam.severity}`);
      console.log(`📅 Effective: ${new Date(notam.effectiveDate).toLocaleString()}`);
      console.log(`📅 Expires: ${new Date(notam.expiryDate).toLocaleString()}`);
      console.log(`📄 Description: ${notam.description}`);
      console.log(`📡 Raw Text: ${notam.text}`);
      console.log('-'.repeat(80));
    });
  }

  // Display SIGMET data
  displaySIGMETs() {
    console.log('\n⚠️  SIGNIFICANT METEOROLOGICAL INFORMATION (SIGMETs):');
    console.log('='.repeat(80));
    
    this.data.sigmets.forEach(sigmet => {
      console.log(`\n🆔 SIGMET ID: ${sigmet.id}`);
      console.log(`⚡ Hazard: ${sigmet.hazard}`);
      console.log(`📊 Intensity: ${sigmet.intensity}`);
      console.log(`🗺️  Coordinates: ${sigmet.coordinates.length} boundary points`);
      console.log(`⛰️  Altitude: ${sigmet.altitude.bottom} ft to ${sigmet.altitude.top} ft`);
      console.log(`🧭 Movement: ${sigmet.movement.direction} at ${sigmet.movement.speed} KT`);
      console.log(`📅 Valid From: ${new Date(sigmet.validFrom).toLocaleString()}`);
      console.log(`📅 Valid To: ${new Date(sigmet.validTo).toLocaleString()}`);
      console.log(`📄 Description: ${sigmet.description}`);
      console.log('-'.repeat(80));
    });
  }

  // Display flight routes
  displayFlightRoutes() {
    console.log('\n✈️  SAMPLE FLIGHT ROUTES:');
    console.log('='.repeat(80));
    
    this.data.routes.forEach(route => {
      console.log(`\n🆔 Route ID: ${route.id}`);
      console.log(`🛫 Origin: ${route.origin}`);
      console.log(`🛬 Destination: ${route.destination}`);
      console.log(`📏 Distance: ${route.distance} nautical miles`);
      console.log(`⏱️  Estimated Time: ${route.estimatedTime}`);
      console.log(`🎯 Cruise Altitude: ${route.cruiseAltitude} ft`);
      console.log(`🗺️  Waypoints:`);
      
      route.waypoints.forEach((waypoint, index) => {
        const icon = waypoint.type === 'departure' ? '🛫' : 
                    waypoint.type === 'arrival' ? '🛬' : '📍';
        console.log(`   ${index + 1}. ${icon} ${waypoint.name} (${waypoint.lat}°, ${waypoint.lon}°)`);
      });
      console.log('-'.repeat(80));
    });
  }

  // Display aircraft types
  displayAircraftTypes() {
    console.log('\n🛩️  AIRCRAFT TYPES:');
    console.log('='.repeat(60));
    
    this.data.aircraftTypes.forEach(aircraft => {
      console.log(`✈️  ${aircraft.code} - ${aircraft.name}`);
      console.log(`   📂 Category: ${aircraft.category}`);
      console.log(`   🚀 Cruise Speed: ${aircraft.cruiseSpeed} knots`);
      console.log();
    });
  }

  // Generate comprehensive weather briefing for specific airport
  generateWeatherBriefing(icao) {
    console.log(`\n📋 COMPREHENSIVE WEATHER BRIEFING FOR ${icao}`);
    console.log('='.repeat(80));
    
    const airport = this.data.airports.find(a => a.icao === icao);
    if (!airport) {
      console.log(`❌ Airport ${icao} not found in database`);
      return;
    }

    console.log(`📍 Airport: ${airport.name}`);
    console.log(`🏙️  Location: ${airport.city}, ${airport.country}`);
    console.log(`🧭 Coordinates: ${airport.lat}°N, ${Math.abs(airport.lon)}°W`);
    console.log(`⛰️  Elevation: ${airport.elevation} ft MSL`);
    console.log();

    // Current weather (METAR)
    const metar = this.data.metar.find(m => m.icao === icao);
    if (metar) {
      console.log('🌤️  CURRENT WEATHER (METAR):');
      console.log('-'.repeat(40));
      console.log(`📡 ${metar.metar}`);
      console.log(`🌡️  ${metar.decoded.temperature}°C, Dewpoint: ${metar.decoded.dewpoint}°C`);
      console.log(`🌬️  Wind: ${metar.decoded.wind.direction}°/${metar.decoded.wind.speed}KT`);
      console.log(`👁️  Visibility: ${metar.decoded.visibility.distance}${metar.decoded.visibility.unit}`);
      console.log(`📋 Conditions: ${metar.decoded.conditions}`);
      console.log(`⚠️  Flight Impact: ${metar.severity}`);
      console.log();
    }

    // Forecast (TAF)
    const taf = this.data.taf.find(t => t.icao === icao);
    if (taf) {
      console.log('📋 FORECAST (TAF):');
      console.log('-'.repeat(40));
      console.log(`📡 ${taf.taf}`);
      console.log();
    }

    // NOTAMs
    const notams = this.data.notams.filter(n => n.icao === icao);
    if (notams.length > 0) {
      console.log('📢 ACTIVE NOTAMs:');
      console.log('-'.repeat(40));
      notams.forEach(notam => {
        console.log(`⚠️  ${notam.severity}: ${notam.subject}`);
        console.log(`   ${notam.description}`);
        console.log(`   Valid: ${new Date(notam.effectiveDate).toLocaleString()} - ${new Date(notam.expiryDate).toLocaleString()}`);
      });
      console.log();
    }
  }

  // Run complete demo
  runFullDemo() {
    this.displayHeader();
    this.displayAirports();
    this.displayMETAR();
    this.displayTAF();
    this.displayNOTAMs();
    this.displaySIGMETs();
    this.displayFlightRoutes();
    this.displayAircraftTypes();

    // Generate briefings for each airport
    console.log('\n🎯 INDIVIDUAL AIRPORT BRIEFINGS:');
    console.log('='.repeat(80));
    this.data.airports.forEach(airport => {
      this.generateWeatherBriefing(airport.icao);
    });

    this.displaySummary();
  }

  // Display demo summary
  displaySummary() {
    console.log('\n📊 DEMO SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Airports Covered: ${this.data.airports.length}`);
    console.log(`✅ METAR Reports: ${this.data.metar.length}`);
    console.log(`✅ TAF Forecasts: ${this.data.taf.length}`);
    console.log(`✅ Active NOTAMs: ${this.data.notams.length}`);
    console.log(`✅ SIGMETs: ${this.data.sigmets.length}`);
    console.log(`✅ Flight Routes: ${this.data.routes.length}`);
    console.log(`✅ Aircraft Types: ${this.data.aircraftTypes.length}`);
    console.log('\n🎉 Aviation Weather Demo Complete!');
    console.log('='.repeat(60) + '\n');
  }

  // Generate JSON report
  generateJsonReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalAirports: this.data.airports.length,
        totalMetarReports: this.data.metar.length,
        totalTafForecasts: this.data.taf.length,
        totalNotams: this.data.notams.length,
        totalSigmets: this.data.sigmets.length,
        totalFlightRoutes: this.data.routes.length,
        totalAircraftTypes: this.data.aircraftTypes.length
      },
      data: this.data
    };

    const reportPath = path.join(__dirname, 'demo-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 JSON report saved to: ${reportPath}`);
    return report;
  }
}

// CLI Interface
if (require.main === module) {
  const demo = new AviationWeatherDemo();
  const command = process.argv[2];
  const parameter = process.argv[3];

  switch (command) {
    case 'full':
      demo.runFullDemo();
      break;
    case 'airports':
      demo.displayHeader();
      demo.displayAirports();
      break;
    case 'metar':
      demo.displayHeader();
      demo.displayMETAR();
      break;
    case 'taf':
      demo.displayHeader();
      demo.displayTAF();
      break;
    case 'notams':
      demo.displayHeader();
      demo.displayNOTAMs();
      break;
    case 'sigmets':
      demo.displayHeader();
      demo.displaySIGMETs();
      break;
    case 'routes':
      demo.displayHeader();
      demo.displayFlightRoutes();
      break;
    case 'aircraft':
      demo.displayHeader();
      demo.displayAircraftTypes();
      break;
    case 'briefing':
      if (!parameter) {
        console.log('❌ Please provide airport ICAO code (e.g., KJFK)');
        process.exit(1);
      }
      demo.displayHeader();
      demo.generateWeatherBriefing(parameter.toUpperCase());
      break;
    case 'json':
      demo.generateJsonReport();
      break;
    default:
      console.log(`
🛩️  Aviation Weather Services Demo

Usage:
  node demo.js full                    # Run complete demo
  node demo.js airports               # Show available airports
  node demo.js metar                  # Show METAR weather reports
  node demo.js taf                    # Show TAF forecasts
  node demo.js notams                 # Show NOTAMs
  node demo.js sigmets                # Show SIGMETs
  node demo.js routes                 # Show flight routes
  node demo.js aircraft               # Show aircraft types
  node demo.js briefing <ICAO>        # Weather briefing for specific airport
  node demo.js json                   # Generate JSON report

Examples:
  node demo.js full                   # Complete aviation weather demo
  node demo.js briefing KJFK          # Weather briefing for JFK airport
  node demo.js metar                  # Show all METAR reports

Available airports: ${seedData.airports.map(a => a.icao).join(', ')}
      `);
  }
}

module.exports = AviationWeatherDemo;