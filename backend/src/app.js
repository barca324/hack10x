const express = require('express')
const session = require('express-session')
const MongoStore = require('connect-mongo')
const passport = require('passport')
require('./config/passport')
require('./config/db')

const authRoutes = require('./routes/auth.routes')
const adminRoutes = require('./routes/admin.routes')
const candidateRoutes = require('./routes/candidate.routes')
const calendarRoutes = require('./routes/calendar.routes')
const outreachRoutes = require('./routes/outreach.routes')
const interviewRoutes = require('./routes/interview.routes')
const panelistRoutes = require('./routes/panelist.routes')
const dashboardRoutes = require('./routes/dashboard.routes')
const isHR = require('./middlewares/isHR')
const { startScheduler } = require('./services/scheduler.service')

const app = express()

// Trust Railway's reverse proxy so secure cookies work over HTTPS
app.set('trust proxy', 1)

// ── CORS — allow frontend + Chrome extension cross-origin ─────────────────────
const ALLOWED_ORIGINS = new Set([
  process.env.FRONTEND_URL || 'http://localhost:8080',
  'http://localhost:8080',
  process.env.EXTENSION_ORIGIN || 'chrome-extension://plnjlaflnkjchlaapbjpllbledijdlla',
])
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

// ── Body Parsers ──────────────────────────────────────────────────────────────
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Session ───────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
  }
}))

// ── Passport ──────────────────────────────────────────────────────────────────
app.use(passport.initialize())
app.use(passport.session())

// ── Routes ────────────────────────────────────────────────────────────────────
// ── Extension feedback (no session — uses API key) ────────────────────────────
const Interview = require('./models/Interview')
const Candidate = require('./models/Candidate')
app.post('/api/interviews/submit-feedback', async (req, res) => {
  const key = req.headers['x-api-key']
  if (!key || key !== process.env.EXTENSION_API_KEY)
    return res.status(401).json({ error: 'Invalid API key' })

  const { meetLink, score, recommendation, reportHtml } = req.body
  if (!meetLink) return res.status(400).json({ error: 'meetLink required' })

  const interview = await Interview.findOne({ meetLink })
  if (!interview) return res.status(404).json({ error: 'Interview not found for this Meet link' })

  const selected =
    recommendation === 'yes' ? true :
    recommendation === 'no' ? false : null

  interview.status = 'Done'
  interview.selected = selected
  interview.score = score ?? null
  interview.reportHtml = reportHtml ?? null
  await interview.save()

  await Candidate.findByIdAndUpdate(interview.candidateId, { interviewStatus: 'interview_completed' })

  res.json({ message: 'Feedback submitted', interviewId: interview._id })
})

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/candidates', candidateRoutes)
app.use('/api/calendar', calendarRoutes)
app.use('/api/outreach', outreachRoutes)
app.use('/api/interviews', interviewRoutes)
app.use('/api/panelists', panelistRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.get('/api/manual-interventions', isHR, (_req, res) => res.json([]))
app.get('/api/notifications', isHR, (_req, res) => res.json([]))

startScheduler()

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }))

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' })
})

module.exports = app
