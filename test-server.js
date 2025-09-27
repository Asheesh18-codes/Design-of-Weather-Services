// Simple Flight Plan Controller Test
const express = require('express');
const app = express();

app.use(express.json());

// Test endpoint
app.post('/api/flightplan', (req, res) => {
  console.log('Received request body:', JSON.stringify(req.body, null, 2));
  
  const { origin, destination, altitude = 35000 } = req.body;
  
  if (!origin || !destination) {
    console.log('Missing required fields');
    return res.status(400).json({
      error: 'Missing required parameters',
      required: ['origin', 'destination'],
      provided: req.body
    });
  }
  
  // Simple mock response
  const response = {
    success: true,
    flightPlan: {
      origin,
      destination,
      altitude,
      waypoints: [
        { lat: 40.6413, lon: -73.7781, name: origin, type: 'departure' },
        { lat: 39.0, lon: -100.0, name: 'MIDPOINT', type: 'waypoint' },
        { lat: 37.6213, lon: -122.3790, name: destination, type: 'arrival' }
      ],
      distance: 2586,
      estimatedTime: '5h 30m'
    },
    generatedAt: new Date().toISOString()
  };
  
  console.log('Sending response:', JSON.stringify(response, null, 2));
  res.json(response);
});

app.listen(5001, () => {
  console.log('Test server running on port 5001');
});