const express = require('express');
const router = express.Router();
const flightPlanController = require('../controllers/flightPlanController');

// Generate flight plan with waypoints
// POST /api/flightplan/generate
router.post('/generate', flightPlanController.generate);

// Get weather briefing for entire route
// POST /api/flightplan/briefing
router.post('/briefing', flightPlanController.getRouteBriefing);

// Analyze route safety
// POST /api/flightplan/analyze
router.post('/analyze', flightPlanController.analyzeSafety);

module.exports = router;