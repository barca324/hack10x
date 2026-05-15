const router = require('express').Router()
const { authorize, callback } = require('../controllers/calendar.controller')

// Public — accessed from panelist email link
router.get('/authorize', authorize)   // validate JWT → redirect to Google OAuth
router.get('/callback', callback)     // Google callback → encrypt + store tokens

module.exports = router
