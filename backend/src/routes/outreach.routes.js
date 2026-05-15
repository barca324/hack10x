const router = require('express').Router()
const { panelistRespond, candidateRespond } = require('../controllers/outreach.controller')

// Public — token-authenticated via query param; return HTML pages
router.get('/panelist-respond', panelistRespond)   // Workflow 2
router.get('/candidate-respond', candidateRespond) // Workflow 4

module.exports = router
