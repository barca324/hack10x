const router = require('express').Router()
const passport = require('passport')
const { me, logout } = require('../controllers/auth.controller')
const isHR = require('../middlewares/isHR')

// Initiate Google OAuth login
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))

// OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/api/auth/login-failed' }),
  (req, res) => {
    if (process.env.FRONTEND_URL)
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard`)
    res.json({ message: 'Login successful', user: req.user })
  }
)

// Login failed
router.get('/login-failed', (req, res) => {
  res.status(401).json({
    error: 'Login failed',
    reason: 'Your account is not authorized. Make sure your email matches SUPER_ADMIN_EMAIL or is added to the HR whitelist by the admin.'
  })
})

// ── DEV-ONLY: bypass login for Postman testing ────────────────────────────────
// REMOVE THIS IN PRODUCTION
router.post('/dev-login', (req, res) => {
  if (process.env.NODE_ENV === 'production')
    return res.status(404).json({ error: 'Not found' })

  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'email required' })

  const user = {
    email,
    role: email === process.env.SUPER_ADMIN_EMAIL ? 'admin' : 'hr',
    name: 'Dev User'
  }

  // Set passport session the same way Passport.js does internally
  req.session.passport = { user }
  req.user = user

  // Explicitly save session before responding so cookie is valid on next request
  req.session.save(err => {
    if (err) return res.status(500).json({ error: 'Session save failed', detail: err.message })
    res.json({ message: 'Dev login successful', user })
  })
})
// ─────────────────────────────────────────────────────────────────────────────

// Current session user
router.get('/me', isHR, me)

// Logout
router.post('/logout', isHR, logout)

module.exports = router

