const { v4: uuidv4 } = require('uuid')
const SlotPool = require('../models/SlotPool')
const OutreachLog = require('../models/OutreachLog')
const Candidate = require('../models/Candidate')
const { getEligiblePanelists } = require('./roundRobin.service')
const { getFreeSlotsForPanelist } = require('./calendar.service')
const { sendPanelistOutreachEmail, sendAdminAlertEmail } = require('./email.service')

/**
 * On outreach failure: schedule a retry or send final admin alert if retries exhausted.
 */
async function handleOutreachFailure(candidate, reason) {
  const MAX_RETRIES  = parseInt(process.env.MAX_OUTREACH_RETRIES      || '3')
  const DELAY_HOURS  = parseInt(process.env.OUTREACH_RETRY_DELAY_HOURS || '24')

  const fresh = await Candidate.findById(candidate._id)
  const retryCount = fresh.outreachRetryCount || 0

  if (retryCount < MAX_RETRIES) {
    const nextOutreachAt = new Date(Date.now() + DELAY_HOURS * 60 * 60 * 1000)
    await Candidate.findByIdAndUpdate(candidate._id, {
      outreachRetryCount: retryCount + 1,
      nextOutreachAt
    })
    console.warn(`[Outreach] Retry ${retryCount + 1}/${MAX_RETRIES} scheduled for ${candidate.name} at ${nextOutreachAt.toISOString()} — reason: ${reason}`)
  } else {
    console.warn(`[Outreach] Max retries exhausted for ${candidate.name} — sending admin alert`)
    await sendAdminAlertEmail({ candidate, exhausted: true })
  }
}

/**
 * Workflow 1 — Candidate Added → Panelist Outreach
 */
async function runOutreachWorkflow(candidate) {
  // Clear retry fields so this run starts fresh
  await Candidate.findByIdAndUpdate(candidate._id, { nextOutreachAt: null })

  const eligiblePanelists = await getEligiblePanelists(candidate.roleApplied)

  if (eligiblePanelists.length === 0) {
    console.warn(`No eligible panelists for ${candidate.name} (${candidate.roleApplied})`)
    await handleOutreachFailure(candidate, 'no_eligible_panelists')
    return
  }

  const outreachRoundId = uuidv4()
  const delayMs = parseInt(process.env.CANDIDATE_OUTREACH_DELAY_MINUTES || '30') * 60 * 1000

  await SlotPool.create({
    candidateId: candidate._id,
    outreachRoundId,
    slots: [],
    status: 'awaiting_panelists',
    candidateOutreachAfter: new Date(Date.now() + delayMs)
  })

  let sentCount = 0

  for (const panelist of eligiblePanelists) {
    try {
      const freeSlots = await getFreeSlotsForPanelist(panelist)
      if (freeSlots.length === 0) continue

      const outreachToken = uuidv4()
      const tokenExpiresAt = new Date(
        Date.now() + parseInt(process.env.OUTREACH_TOKEN_TTL_HOURS || '48') * 60 * 60 * 1000
      )

      await OutreachLog.create({
        panelistId: panelist._id,
        candidateId: candidate._id,
        outreachRoundId,
        outreachToken,
        tokenExpiresAt,
        emailSent: false
      })

      await sendPanelistOutreachEmail({ panelist, candidate, freeSlots, outreachToken })
      await OutreachLog.findOneAndUpdate({ outreachToken }, { emailSent: true })
      sentCount++
    } catch (err) {
      console.error(`Outreach error for panelist ${panelist.email}:`, err.message)
    }
  }

  if (sentCount === 0) {
    console.warn(`All panelists had no free slots for candidate ${candidate.name}`)
    await SlotPool.findOneAndUpdate({ candidateId: candidate._id, outreachRoundId }, { status: 'no_slots' })
    await handleOutreachFailure(candidate, 'no_free_slots')
  }
}

module.exports = { runOutreachWorkflow, handleOutreachFailure }
