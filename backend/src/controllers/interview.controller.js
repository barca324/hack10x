const Interview = require('../models/Interview')
const Candidate = require('../models/Candidate')
const Panelist = require('../models/Panelist')
const { insertCalendarEvent } = require('../services/calendar.service')
const { sendPanelistConfirmationEmail, sendCandidateConfirmationEmail } = require('../services/email.service')

// GET /api/interviews?status=&position=&panelistName=&selected=&date=
exports.listInterviews = async (req, res, next) => {
  try {
    const { status, position, selected, date } = req.query
    const filter = {}

    if (status) filter.status = status
    if (position) filter.roleApplied = position
    if (selected !== undefined) filter.selected = selected === 'true'
    if (date) {
      const start = new Date(date)
      const end = new Date(date)
      end.setDate(end.getDate() + 1)
      filter.scheduledAt = { $gte: start, $lt: end }
    }

    let query = Interview.find(filter)
      .populate('candidateId', 'name email roleApplied resumeUrl levelCode')
      .populate('panelistId', 'name email empId position')
      .sort({ scheduledAt: -1 })

    // panelistName filter (post-populate)
    let interviews = await query
    if (req.query.panelistName) {
      const name = req.query.panelistName.toLowerCase()
      interviews = interviews.filter(i =>
        i.panelistId?.name?.toLowerCase().includes(name)
      )
    }

    res.json(interviews)
  } catch (err) { next(err) }
}

// POST /api/interviews/schedule — HR directly books an interview
exports.scheduleInterview = async (req, res, next) => {
  try {
    const { candidateId, panelistId, scheduledAt } = req.body
    if (!candidateId || !panelistId || !scheduledAt)
      return res.status(400).json({ error: 'candidateId, panelistId and scheduledAt are required' })

    const candidate = await Candidate.findById(candidateId)
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' })

    const panelist = await Panelist.findById(panelistId)
    if (!panelist) return res.status(404).json({ error: 'Panelist not found' })

    const slotStart = new Date(scheduledAt)
    const slotEnd   = new Date(slotStart.getTime() + 60 * 60 * 1000)
    const fmt = (d) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
    const interviewSlot = `${fmt(slotStart)} – ${fmt(slotEnd)}`

    const interview = await Interview.create({
      candidateId: candidate._id,
      panelistId: panelist._id,
      scheduledAt: slotStart,
      interviewSlot,
      status: 'Pending',
      roleApplied: candidate.roleApplied,
    })

    await Candidate.findByIdAndUpdate(candidate._id, {
      assignedPanelistId: panelist._id,
      interviewStatus: 'Scheduled',
    })

    await Panelist.findByIdAndUpdate(panelist._id, { lastAssignedAt: new Date() })

    let meetLink = null
    try {
      meetLink = await insertCalendarEvent(panelist, { candidate, scheduledAt: slotStart })
      if (meetLink) await Interview.findByIdAndUpdate(interview._id, { meetLink })
    } catch (err) {
      console.error('Calendar event insert failed (non-fatal):', err.message)
    }

    await sendPanelistConfirmationEmail({ panelist, candidate, scheduledAt: slotStart, meetLink })
    await sendCandidateConfirmationEmail({ candidate, scheduledAt: slotStart, meetLink })

    res.status(201).json(interview)
  } catch (err) { next(err) }
}

// PATCH /api/interviews/:id
// Update status or selected flag; updates panelist stats
exports.updateInterview = async (req, res, next) => {
  try {
    const { status, selected } = req.body
    const interview = await Interview.findById(req.params.id)
    if (!interview) return res.status(404).json({ error: 'Interview not found' })

    // Track if status changes to Done for the first time
    const completingNow = status === 'Done' && interview.status !== 'Done'

    if (status) interview.status = status
    if (selected !== undefined) interview.selected = selected
    await interview.save()

    // Update panelist stats when interview is marked Done
    if (completingNow) {
      const panelistUpdate = { $inc: { totalInterviewed: 1 } }
      if (selected === true) panelistUpdate.$inc.totalSelected = 1
      await Panelist.findByIdAndUpdate(interview.panelistId, panelistUpdate)
    }

    res.json(interview)
  } catch (err) { next(err) }
}
