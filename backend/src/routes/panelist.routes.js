const router = require('express').Router()
const isHR = require('../middlewares/isHR')
const isAdmin = require('../middlewares/isAdmin')
const Panelist = require('../models/Panelist')

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
    const { name, emp_id, email, designation } = req.body
    const p = await Panelist.create({
      name,
      empId: emp_id,
      email,
      position: designation,
    })
    res.status(201).json(normalize(p))
  } catch (err) { next(err) }
})

module.exports = router
