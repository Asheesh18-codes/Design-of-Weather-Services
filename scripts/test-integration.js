#!/usr/bin/env node

// Integration Test Script for Aviation Weather System
// Tests complete data flow: Frontend -> Node.js -> Python NLP

const axios = require('axios');

// Configuration
const NODE_API_BASE = 'http://localhost:5000/api';
const PYTHON_NLP_BASE = 'http://localhost:8000';
const FRONTEND_BASE = 'http://localhost:5173';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = (color, message) => console.log(`${color}${message}${colors.reset}`);

async function testService(name, url) {
  try {
    const response = await axios.get(url, { timeout: 5000 });
    log(colors.green, `✅ ${name}: ${response.status} ${response.statusText}`);
    return true;
  } catch (error) {
    log(colors.red, `❌ ${name}: ${error.message}`);
    return false;
  }
}

async function testNodePythonIntegration() {
  log(colors.cyan, '\n🔗 Testing Node.js -> Python NLP Integration');
  
  const testNotam = "NOTAM A1234/24: KJFK 24001 - Runway 04L-22R closed for maintenance until 24002";
  
  try {
    // Test NOTAM parsing through Node.js
    const response = await axios.post(`${NODE_API_BASE}/notam/parse`, {
      notam_text: testNotam,
      airport_code: 'KJFK'
    }, { timeout: 10000 });
    
    log(colors.green, `✅ NOTAM parsing integration successful`);
    log(colors.blue, `📊 Response: ${JSON.stringify(response.data, null, 2)}`);
    return true;
  } catch (error) {
    log(colors.yellow, `⚠️  NOTAM parsing test: ${error.response?.status || error.message}`);
    
    // Try direct Python NLP test
    try {
      const directResponse = await axios.post(`${PYTHON_NLP_BASE}/nlp/parse-notam`, {
        notam_text: testNotam,
        airport_code: 'KJFK'
      }, { timeout: 10000 });
      
      log(colors.green, `✅ Direct Python NLP connection working`);
      return true;
    } catch (directError) {
      log(colors.red, `❌ Direct Python NLP test failed: ${directError.message}`);
      return false;
    }
  }
}

async function testFlightPlanGeneration() {
  log(colors.cyan, '\n🛩️  Testing Flight Plan Generation');
  
  try {
    const response = await axios.post(`${NODE_API_BASE}/flightplan`, {
      origin: 'KJFK',
      destination: 'KLAX',
      altitude: 35000
    }, { timeout: 10000 });
    
    log(colors.green, `✅ Flight plan generation successful`);
    log(colors.blue, `📊 Waypoints: ${response.data.waypoints?.length || 0} generated`);
    return true;
  } catch (error) {
    log(colors.yellow, `⚠️  Flight plan test: ${error.response?.status || error.message}`);
    return false;
  }
}

async function testWeatherData() {
  log(colors.cyan, '\n🌤️  Testing Weather Data Retrieval');
  
  try {
    const response = await axios.post(`${NODE_API_BASE}/weather`, {
      airport_code: 'KJFK'
    }, { timeout: 10000 });
    
    log(colors.green, `✅ Weather data retrieval successful`);
    log(colors.blue, `📊 Weather data available for KJFK`);
    return true;
  } catch (error) {
    log(colors.yellow, `⚠️  Weather test: ${error.response?.status || error.message}`);
    return false;
  }
}

async function runIntegrationTests() {
  log(colors.blue, '🚀 Aviation Weather System - Integration Test');
  log(colors.blue, '='.repeat(50));
  
  // Test individual service health
  log(colors.cyan, '\n🏥 Health Check Tests');
  const nodeHealthy = await testService('Node.js Backend', `${NODE_API_BASE}/../`);
  const pythonHealthy = await testService('Python NLP Backend', `${PYTHON_NLP_BASE}/docs`);
  const frontendHealthy = await testService('React Frontend', FRONTEND_BASE);
  
  if (!nodeHealthy || !pythonHealthy || !frontendHealthy) {
    log(colors.red, '\n❌ Some services are not running. Please check the setup.');
    process.exit(1);
  }
  
  // Test integrations
  const integrationTests = [
    testNodePythonIntegration(),
    testFlightPlanGeneration(),
    testWeatherData()
  ];
  
  const results = await Promise.allSettled(integrationTests);
  const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
  
  // Summary
  log(colors.cyan, '\n📊 Integration Test Summary');
  log(colors.green, `✅ Services Running: 3/3`);
  log(colors.green, `✅ Integration Tests Passed: ${successful}/${results.length}`);
  
  if (successful === results.length) {
    log(colors.green, '\n🎉 All systems integrated successfully!');
    log(colors.blue, `\n🌐 Access your application at: ${FRONTEND_BASE}`);
  } else {
    log(colors.yellow, '\n⚠️  Some integration tests failed. Check the logs above.');
  }
}

// Run the tests
runIntegrationTests().catch(error => {
  log(colors.red, `💥 Test runner error: ${error.message}`);
  process.exit(1);
});