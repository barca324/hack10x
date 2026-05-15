const SlotPool = require('../models/SlotPool')
const Candidate = require('../models/Candidate')
const Panelist = require('../models/Panelist')
const Interview = require('../models/Interview')
const { insertCalendarEvent } = require('./calendar.service')
const { sendPanelistConfirmationEmail, sendCandidateConfirmationEmail } = require('./email.service')

/**
 * Workflow 4 — Candidate Picks Slot → Booking + Confirmation
 *
 * @param {string} candidateToken - UUID from the candidate's email link
 * @param {number} slotIndex      - index of the chosen slot in SlotPool.slots
 */
async function confirmBooking(candidateToken, slotIndex) {
  const pool = await SlotPool.findOne({ candidateToken })
  if (!pool) throw new Error('NOT_FOUND')

  if (pool.candidateTokenExpiresAt < new Date()) throw new Error('EXPIRED')

  // Atomic lock — only process once
  const locked = await SlotPool.findOneAndUpdate(
    { candidateToken, candidateTokenStatus: 'PENDING' },
    { candidateTokenStatus: 'RESPONDED', status: 'booked' }
  )

  if (!locked) throw new Error('ALREADY_BOOKED')

  // Reload full pool
  const freshPool = await SlotPool.findById(pool._id)
  const chosenSlot = freshPool.slots[slotIndex]

  if (!chosenSlot) throw new Error('INVALID_SLOT')

  const candidate = await Candidate.findById(freshPool.candidateId)
  if (!candidate) throw new Error('CANDIDATE_NOT_FOUND')

  // Round-robin: sort panelistIds by lastAssignedAt ASC (nulls first) → pick first
  // who doesn't already have an interview at this exact time (double-booking guard)
  const panelists = await Panelist.find({ _id: { $in: chosenSlot.panelistIds } })
    .sort({ lastAssignedAt: 1 })

  const slotStart = new Date(chosenSlot.time)
  const slotEnd   = new Date(slotStart.getTime() + 60 * 60 * 1000)

  let assignedPanelist = null
  for (const p of panelists) {
    // Check if this panelist already has an interview that overlaps this time
    const conflict = await Interview.findOne({
      panelistId: p._id,
      status: 'Pending',
      scheduledAt: { $gte: slotStart, $lt: slotEnd }
    })
    if (!conflict) {
      assignedPanelist = p
      break
    }
    console.warn(`⚠️  Double-booking avoided: panelist ${p.email} already has interview at ${slotStart.toISOString()}`)
  }

  if (!assignedPanelist) {
    // Revert atomic lock so candidate can pick a different slot
    await SlotPool.findOneAndUpdate(
      { candidateToken },
      { candidateTokenStatus: 'PENDING', status: 'awaiting_candidate' }
    )
    throw new Error('SLOT_UNAVAILABLE')
  }

  const scheduledAt = new Date(chosenSlot.time)

  // Format human-readable slot label e.g. "10:00 AM – 11:00 AM"
  const fmt = (d) => d.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
  })
  const endAt = new Date(scheduledAt.getTime() + 60 * 60 * 1000)
  const interviewSlot = `${fmt(scheduledAt)} – ${fmt(endAt)}`

  // Create Interview record
  const interview = await Interview.create({
    candidateId: candidate._id,
    panelistId: assignedPanelist._id,
    scheduledAt,
    interviewSlot,
    status: 'Pending',
    roleApplied: candidate.roleApplied
  })

  // Update Candidate
  await Candidate.findByIdAndUpdate(candidate._id, {
    assignedPanelistId: assignedPanelist._id,
    interviewStatus: 'Scheduled'
  })

  // Update Panelist lastAssignedAt
  await Panelist.findByIdAndUpdate(assignedPanelist._id, {
    lastAssignedAt: new Date()
  })

  // Insert Google Calendar event (with Meet link) on panelist's calendar
  let meetLink = null
  try {
    meetLink = await insertCalendarEvent(assignedPanelist, { candidate, scheduledAt })
    if (meetLink) await Interview.findByIdAndUpdate(interview._id, { meetLink })
  } catch (err) {
    console.error('Calendar event insert failed (non-fatal):', err.message)
  }

  // Send confirmation emails
  await sendPanelistConfirmationEmail({
    panelist: assignedPanelist,
    candidate,
    scheduledAt,
    meetLink
  })

  await sendCandidateConfirmationEmail({ candidate, scheduledAt, meetLink })

  return interview
}

module.exports = { confirmBooking }
