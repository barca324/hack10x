const SlotPool = require('../models/SlotPool')
const Candidate = require('../models/Candidate')
const { deduplicateSlots } = require('../utils/deduplicateSlots')
const { triggerCandidateOutreach } = require('./slotPool.service')
const { sendAdminAlertEmail } = require('./email.service')

async function runCandidateOutreachScheduler() {
  const now = new Date()

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
        await sendAdminAlertEmail({ candidate })
        console.warn(`No slots collected for ${candidate.name} — HR alerted`)
        continue
      }

      await triggerCandidateOutreach(pool, uniqueSlotTimes)
    } catch (err) {
      console.error(`Scheduler error for SlotPool ${pool._id}:`, err.message)
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
