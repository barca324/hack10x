const { v4: uuidv4 } = require('uuid')
const SlotPool = require('../models/SlotPool')
const Interview = require('../models/Interview')
const { sendCandidateSlotEmail } = require('./email.service')

/**
 * Workflow 2: Handle panelist response — upserts confirmed slots into SlotPool.
 * Candidate outreach is triggered by the scheduler after candidateOutreachAfter.
 */
async function handlePanelistResponse(outreachLog, confirmedSlots) {
  const { candidateId, outreachRoundId, panelistId } = outreachLog

  const slotPool = await SlotPool.findOne({ candidateId, outreachRoundId })
  if (!slotPool) return { skippedSlots: [] }

  const skippedSlots  = []
  const acceptedSlots = []

  for (const slotTime of confirmedSlots) {
    const slotStart = new Date(slotTime)
    const slotEnd   = new Date(slotStart.getTime() + 60 * 60 * 1000)

    const interviewConflict = await Interview.findOne({
      panelistId,
      status: 'Pending',
      scheduledAt: { $gte: slotStart, $lt: slotEnd }
    })
    if (interviewConflict) { skippedSlots.push(slotStart); continue }

    const poolConflict = await SlotPool.findOne({
      _id: { $ne: slotPool._id },
      status: { $in: ['awaiting_panelists', 'awaiting_candidate'] },
      slots: { $elemMatch: { time: slotStart, panelistIds: panelistId } }
    })
    if (poolConflict) { skippedSlots.push(slotStart); continue }

    const existing = slotPool.slots.find(
      s => new Date(s.time).getTime() === slotStart.getTime()
    )

    if (existing) {
      await SlotPool.findOneAndUpdate(
        { _id: slotPool._id, 'slots.time': slotTime },
        { $addToSet: { 'slots.$.panelistIds': panelistId } }
      )
    } else {
      await SlotPool.findByIdAndUpdate(slotPool._id, {
        $push: { slots: { time: slotTime, panelistIds: [panelistId] } }
      })
    }

    acceptedSlots.push(slotStart)
  }

  return { skippedSlots, acceptedSlots }
}

/**
 * Workflow 3 — Send candidate slot selection email
 */
async function triggerCandidateOutreach(slotPool, uniqueSlotTimes) {
  const Candidate = require('../models/Candidate')
  const candidate = await Candidate.findById(slotPool.candidateId)
  if (!candidate) return

  const candidateToken = uuidv4()
  const candidateTokenExpiresAt = new Date(
    Date.now() + parseInt(process.env.OUTREACH_TOKEN_TTL_HOURS || '48') * 60 * 60 * 1000
  )

  // Sort chronologically
  const sortedSlots = [...uniqueSlotTimes].sort((a, b) => new Date(a) - new Date(b))

  // Send email first — only update status after successful send so scheduler can retry on failure
  await sendCandidateSlotEmail({ candidate, slots: sortedSlots, candidateToken })

  await SlotPool.findByIdAndUpdate(slotPool._id, {
    candidateToken,
    candidateTokenStatus: 'PENDING',
    candidateTokenExpiresAt,
    status: 'awaiting_candidate'
  })
}

module.exports = { handlePanelistResponse, triggerCandidateOutreach }
