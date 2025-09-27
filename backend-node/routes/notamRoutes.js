const express = require('express');
const router = express.Router();
const notamController = require('../controllers/notamController');

// Parse single NOTAM using Python NLP service
// POST /api/notam/parse-single
router.post('/parse-single', notamController.parseNotam);

// Summarize NOTAM/Weather data using NLP
// POST /api/notam/summarize
router.post('/summarize', notamController.summarize);

// Get NOTAMs for airport
// GET /api/notam/:icao
router.get('/:icao', notamController.getNotams);

// Parse and categorize multiple NOTAMs
// POST /api/notam/parse
router.post('/parse', notamController.parseNotams);

// Get critical NOTAMs for route
// POST /api/notam/route-critical
router.post('/route-critical', notamController.getRouteCriticalNotams);

module.exports = router;