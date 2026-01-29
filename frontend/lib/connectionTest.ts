// API Connection Test Utility
// Use this to verify backend services are running and accessible

import { weatherAPI, flightPlanAPI, notamAPI, airportAPI } from './api';
import { nlpAPI } from './nlpApi';

export interface ServiceStatus {
  name: string;
  url: string;
  status: 'online' | 'offline' | 'error';
  responseTime?: number;
  version?: string;
  error?: string;
}

export async function testBackendConnections(): Promise<ServiceStatus[]> {
  const results: ServiceStatus[] = [];

  // Test Node.js Backend
  const nodeStart = Date.now();
  try {
    const response = await fetch(process.env.NEXT_PUBLIC_NODE_API_BASE?.replace('/api', '') || 'http://localhost:5000');
    const nodeTime = Date.now() - nodeStart;
    const data = await response.json();
    
    results.push({
      name: 'Node.js Backend',
      url: process.env.NEXT_PUBLIC_NODE_API_BASE || 'http://localhost:5000/api',
      status: 'online',
      responseTime: nodeTime,
      version: data.version || 'N/A'
    });
  } catch (error) {
    results.push({
      name: 'Node.js Backend',
      url: process.env.NEXT_PUBLIC_NODE_API_BASE || 'http://localhost:5000/api',
      status: 'offline',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test Python NLP Service
  const pythonStart = Date.now();
  try {
    const response = await nlpAPI.checkHealth();
    const pythonTime = Date.now() - pythonStart;
    
    results.push({
      name: 'Python NLP Service',
      url: process.env.NEXT_PUBLIC_PYTHON_NLP_BASE || 'http://localhost:8000',
      status: response.healthy ? 'online' : 'offline',
      responseTime: pythonTime,
      version: response.version || 'N/A',
      error: response.error
    });
  } catch (error) {
    results.push({
      name: 'Python NLP Service',
      url: process.env.NEXT_PUBLIC_PYTHON_NLP_BASE || 'http://localhost:8000',
      status: 'offline',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  return results;
}

export async function testWeatherAPI(icao: string = 'KJFK'): Promise<boolean> {
  try {
    const metar = await weatherAPI.getLatestMetar(icao);
    return metar && metar.raw !== 'N/A';
  } catch (error) {
    console.error('Weather API test failed:', error);
    return false;
  }
}

export async function testFlightPlanAPI(): Promise<boolean> {
  try {
    const result = await flightPlanAPI.generateWaypoints({
      origin: 'KJFK',
      destination: 'KLAX'
    });
    return result && result.waypoints && result.waypoints.length > 0;
  } catch (error) {
    console.error('Flight Plan API test failed:', error);
    return false;
  }
}

export async function testNLPAPI(): Promise<boolean> {
  try {
    const result = await nlpAPI.parseNotamDirect({
      notam_text: 'RWY 13/31 CLOSED DUE TO MAINTENANCE',
      airport_code: 'KJFK'
    });
    return result.success;
  } catch (error) {
    console.error('NLP API test failed:', error);
    return false;
  }
}

export async function runAllTests() {
  console.log('🧪 Running Backend Connection Tests...\n');
  
  const serviceStatuses = await testBackendConnections();
  
  console.log('Service Status:');
  serviceStatuses.forEach(service => {
    const statusEmoji = service.status === 'online' ? '✅' : '❌';
    console.log(`${statusEmoji} ${service.name}: ${service.status}`);
    if (service.responseTime) {
      console.log(`   Response Time: ${service.responseTime}ms`);
    }
    if (service.version) {
      console.log(`   Version: ${service.version}`);
    }
    if (service.error) {
      console.log(`   Error: ${service.error}`);
    }
  });

  console.log('\nAPI Functionality Tests:');
  
  const weatherTest = await testWeatherAPI();
  console.log(`${weatherTest ? '✅' : '❌'} Weather API`);
  
  const flightPlanTest = await testFlightPlanAPI();
  console.log(`${flightPlanTest ? '✅' : '❌'} Flight Plan API`);
  
  const nlpTest = await testNLPAPI();
  console.log(`${nlpTest ? '✅' : '❌'} NLP API`);

  return {
    services: serviceStatuses,
    apis: {
      weather: weatherTest,
      flightPlan: flightPlanTest,
      nlp: nlpTest
    }
  };
}
