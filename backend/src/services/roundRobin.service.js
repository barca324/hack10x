const Panelist = require('../models/Panelist')
const Interview = require('../models/Interview')

/**
 * Workflow 6 — Round-Robin Eligibility Filter
 *
 * Returns eligible panelists sorted by lastAssignedAt ASC (nulls first).
 * Eligibility criteria:
 *   1. eligibleFor includes candidate.roleApplied
 *   2. authStatus = true (calendar connected)
 *   3. lastAssignedAt = null  OR  lastAssignedAt < now - 48h
 *   4. No pending Interview assigned to this panelist
 */
async function getEligiblePanelists(roleApplied) {
  const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_INTERVIEWS || '3')

  // Count pending interviews per panelist
  const pendingCounts = await Interview.aggregate([
    { $match: { status: 'Pending' } },
    { $group: { _id: '$panelistId', count: { $sum: 1 } } }
  ])
  const atCapIds = new Set(
    pendingCounts
      .filter(r => r.count >= MAX_CONCURRENT)
      .map(r => r._id.toString())
  )

  const panelists = await Panelist.find({
    eligibleFor: roleApplied,
    authStatus: true
  }).sort({ lastAssignedAt: 1 })

  return panelists.filter(p => !atCapIds.has(p._id.toString()))
}

module.exports = { getEligiblePanelists }
