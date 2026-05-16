const { v4: uuidv4 } = require('uuid')
const SlotPool = require('../models/SlotPool')
const OutreachLog = require('../models/OutreachLog')
const { getEligiblePanelists } = require('./roundRobin.service')
const { getFreeSlotsForPanelist } = require('./calendar.service')
const { sendPanelistOutreachEmail, sendAdminAlertEmail } = require('./email.service')

/**
 * Workflow 1 — Candidate Added → Panelist Outreach
 *
 * 1. Find all eligible panelists (round-robin filter)
 * 2. Query each panelist's Google Calendar for free 1-hr slots
 * 3. Create SlotPool for this candidate
 * 4. For each panelist with ≥1 free slot: create OutreachLog + send email
 */
async function runOutreachWorkflow(candidate) {
  const eligiblePanelists = await getEligiblePanelists(candidate.roleApplied)

  if (eligiblePanelists.length === 0) {
    console.warn(`No eligible panelists for ${candidate.name} (${candidate.roleApplied})`)
    await sendAdminAlertEmail({ candidate })
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
    await sendAdminAlertEmail({ candidate })
  }
}

module.exports = { runOutreachWorkflow }
