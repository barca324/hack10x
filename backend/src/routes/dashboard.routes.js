const router = require('express').Router()
const isHR = require('../middlewares/isHR')
const Candidate = require('../models/Candidate')
const Interview = require('../models/Interview')

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

module.exports = router
