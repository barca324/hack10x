const router = require('express').Router()
const jwt = require('jsonwebtoken')
const isHR = require('../middlewares/isHR')
const isAdmin = require('../middlewares/isAdmin')
const Panelist = require('../models/Panelist')
const { sendCalendarAuthEmail } = require('../services/email.service')

async function sendCalendarLink(panelist) {
  const token = jwt.sign({ panelistId: panelist._id }, process.env.JWT_SECRET, { expiresIn: '24h' })
  await Panelist.findByIdAndUpdate(panelist._id, {
    authLinkToken: token,
    authLinkExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  })
  await sendCalendarAuthEmail(panelist, token)
}

function normalize(p) {
  return {
    id: p._id,
    name: p.name,
    emp_id: p.empId || null,
    email: p.email,
    designation: p.position || null,
    is_active: p.authStatus || false,
    total_interviews: p.totalInterviewed || 0,
    total_selected: p.totalSelected || 0,
    added_on: p.addedOn,
  }
}

router.use(isHR)

// List all panelists — accessible to all HR
router.get('/', async (_req, res, next) => {
  try {
    const panelists = await Panelist.find().sort({ addedOn: -1 }).lean()
    res.json(panelists.map(normalize))
  } catch (err) { next(err) }
})

// Get the panelist record for the currently logged-in user (used by feedback page)
router.get('/me', async (req, res, next) => {
  try {
    const panelist = await Panelist.findOne({ email: req.user.email }).lean()
    res.json(panelist ? normalize(panelist) : null)
  } catch (err) { next(err) }
})

// Add a panelist — admin only
router.post('/', isAdmin, async (req, res, next) => {
  try {
    const { name, emp_id, email, designation, eligible_for } = req.body
    const p = await Panelist.create({
      name, empId: emp_id, email, position: designation,
      eligibleFor: Array.isArray(eligible_for) ? eligible_for : [],
    })
    sendCalendarLink(p).catch(err => console.error('Calendar auth email failed:', err.message))
    res.status(201).json(normalize(p))
  } catch (err) { next(err) }
})

// Resend calendar auth email — admin only
router.post('/:id/resend-calendar-auth', isAdmin, async (req, res, next) => {
  try {
    const panelist = await Panelist.findById(req.params.id)
    if (!panelist) return res.status(404).json({ error: 'Panelist not found' })
    await sendCalendarLink(panelist)
    res.json({ message: 'Calendar auth email sent' })
  } catch (err) { next(err) }
})

module.exports = router
