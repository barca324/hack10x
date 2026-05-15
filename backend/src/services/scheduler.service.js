const SlotPool = require('../models/SlotPool')
const Candidate = require('../models/Candidate')
const { deduplicateSlots } = require('../utils/deduplicateSlots')
const { triggerCandidateOutreach } = require('./slotPool.service')
const { runOutreachWorkflow, handleOutreachFailure } = require('./outreach.service')

async function runCandidateOutreachScheduler() {
  const now = new Date()

  // ── Part 1: Fire candidate slot-selection email for due pools ─────────────
  const duePools = await SlotPool.find({
    status: 'awaiting_panelists',
    candidateOutreachAfter: { $lte: now }
  })

  for (const pool of duePools) {
    try {
      const uniqueSlotTimes = deduplicateSlots(pool.slots.map(s => s.time))

      if (uniqueSlotTimes.length === 0) {
        const candidate = await Candidate.findById(pool.candidateId)
        await SlotPool.findByIdAndUpdate(pool._id, { status: 'no_slots' })
        await handleOutreachFailure(candidate, 'no_panelist_response')
        console.warn(`No slots collected for ${candidate.name} — retry scheduled`)
        continue
      }

      await triggerCandidateOutreach(pool, uniqueSlotTimes)
    } catch (err) {
      console.error(`Scheduler error for SlotPool ${pool._id}:`, err.message)
    }
  }

  // ── Part 2: Retry outreach for candidates whose retry time is due ─────────
  const retryDue = await Candidate.find({
    interviewStatus: 'pending',
    nextOutreachAt: { $ne: null, $lte: now }
  })

  for (const candidate of retryDue) {
    try {
      console.log(`[Scheduler] Retrying outreach for ${candidate.name} (retry #${candidate.outreachRetryCount})`)
      await runOutreachWorkflow(candidate)
    } catch (err) {
      console.error(`Retry outreach error for ${candidate.name}:`, err.message)
    }
  }
}

function startScheduler() {
  const delayMs = parseInt(process.env.CANDIDATE_OUTREACH_DELAY_MINUTES || '30') * 60 * 1000
  // Poll at half the delay interval so we never fire more than half-interval late
  const pollMs = Math.min(60_000, Math.floor(delayMs / 2))
  setInterval(runCandidateOutreachScheduler, pollMs)
  console.log(`Candidate outreach scheduler started (poll every ${pollMs / 1000}s)`)
}

module.exports = { startScheduler }
