const express = require('express');
const router = express.Router();
const notamController = require('../controllers/notamController');

// Summarize NOTAM using NLP
// POST /api/notam/summarize
router.post('/summarize', notamController.summarize);

// Get NOTAMs for airport
// GET /api/notam/:icao
router.get('/:icao', notamController.getNotams);

// Parse and categorize NOTAMs
// POST /api/notam/parse
router.post('/parse', notamController.parseNotams);

// Get critical NOTAMs for route
// POST /api/notam/route-critical
router.post('/route-critical', notamController.getRouteCriticalNotams);

module.exports = router;