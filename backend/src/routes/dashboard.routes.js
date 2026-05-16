const router = require('express').Router()
const isHR = require('../middlewares/isHR')
const isAdmin = require('../middlewares/isAdmin')
const Candidate = require('../models/Candidate')
const Interview = require('../models/Interview')
const HR = require('../models/HR')

router.use(isHR)

router.get('/', async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const todayStart = new Date(today)
    const todayEnd = new Date(today)
    todayEnd.setDate(todayEnd.getDate() + 1)

    const [candidates, interviews, todayInterviews] = await Promise.all([
      Candidate.find().lean(),
      Interview.find()
        .populate('candidateId', 'name levelCode roleApplied')
        .populate('panelistId', 'name')
        .lean(),
      Interview.find({ scheduledAt: { $gte: todayStart, $lt: todayEnd } })
        .populate('candidateId', 'name levelCode roleApplied')
        .populate('panelistId', 'name')
        .lean(),
    ])

    res.json({
      candidates: candidates.map(c => ({
        id: c._id,
        status: (c.interviewStatus || 'pending').toLowerCase(),
      })),
      interviews: interviews.map(i => ({
        id: i._id,
        scheduled_date: i.scheduledAt ? i.scheduledAt.toISOString().slice(0, 10) : null,
        result: i.selected === true ? 'selected' : i.selected === false ? 'rejected' : 'pending',
        status: (i.status || 'pending').toLowerCase().replace(/ /g, '_'),
        candidates: i.candidateId ? { level_code: i.candidateId.levelCode || 'E1' } : null,
      })),
      todayInterviews: todayInterviews.map(i => ({
        id: i._id,
        slot_time: i.interviewSlot || null,
        status: (i.status || 'scheduled').toLowerCase().replace(/ /g, '_'),
        round_number: 1,
        candidates: i.candidateId ? {
          name: i.candidateId.name,
          level_code: i.candidateId.levelCode || 'E1',
          role_applied: i.candidateId.roleApplied,
        } : null,
        panelists: i.panelistId ? { name: i.panelistId.name } : null,
      })),
      manualInterventionCount: 0,
    })
  } catch (err) { next(err) }
})

// GET /api/dashboard/admin — super-admin analytics with filters
router.get('/admin', isAdmin, async (req, res, next) => {
  try {
    const { hrEmail, status, role, startDate, endDate } = req.query

    const filter = {}
    if (status) filter.status = status
    if (role) filter.roleApplied = role

    if (startDate || endDate) {
      filter.scheduledAt = {}
      if (startDate) filter.scheduledAt.$gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setDate(end.getDate() + 1)
        filter.scheduledAt.$lt = end
      }
    }

    let interviews = await Interview.find(filter)
      .populate('candidateId', 'name roleApplied addedBy')
      .populate('panelistId', 'name')
      .sort({ scheduledAt: -1 })
      .lean()

    // Filter by HR email (candidate's addedBy field)
    if (hrEmail) {
      interviews = interviews.filter(i => i.candidateId?.addedBy === hrEmail)
    }

    // Collect all unique addedBy emails from the interviews
    const addedByEmails = [...new Set(interviews.map(i => i.candidateId?.addedBy).filter(Boolean))]

    const [hrRecords, roles] = await Promise.all([
      HR.find({ email: { $in: addedByEmails } }).select('name email').lean(),
      Interview.distinct('roleApplied'),
    ])

    // Build email → name map from HR collection + super admin
    const hrNameMap = Object.fromEntries(hrRecords.map(h => [h.email, h.name]))
    if (process.env.SUPER_ADMIN_EMAIL && process.env.SUPER_ADMIN_NAME)
      hrNameMap[process.env.SUPER_ADMIN_EMAIL] = process.env.SUPER_ADMIN_NAME

    // For the HR filter dropdown: all active HR users
    const hrList = await HR.find({ isActive: true }).select('name email').lean()

    res.json({
      interviews: interviews.map(i => {
        const addedBy = i.candidateId?.addedBy || null
        return {
          id: i._id,
          scheduled_date: i.scheduledAt ? i.scheduledAt.toISOString().slice(0, 10) : null,
          slot_time: i.interviewSlot || null,
          status: (i.status || 'pending').toLowerCase().replace(/ /g, '_'),
          result: i.selected === true ? 'selected' : i.selected === false ? 'rejected' : 'pending',
          role_applied: i.roleApplied || i.candidateId?.roleApplied || null,
          candidate_name: i.candidateId?.name || null,
          panelist_name: i.panelistId?.name || null,
          added_by: addedBy,
          added_by_name: addedBy ? (hrNameMap[addedBy] || null) : null,
        }
      }),
      hrList: hrList.map(h => ({ email: h.email, name: h.name })),
      roles,
    })
  } catch (err) { next(err) }
})

module.exports = router
