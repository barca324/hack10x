/**
 * deduplicateSlots.js
 *
 * Returns only unique slot times from an array of Date objects.
 * Compares by UTC timestamp (milliseconds).
 *
 * @param {Date[]} slots
 * @returns {Date[]} unique slot times, sorted chronologically
 */
function deduplicateSlots(slots) {
  const seen = new Set()
  return slots
    .filter(slot => {
      const ts = new Date(slot).getTime()
      if (seen.has(ts)) return false
      seen.add(ts)
      return true
    })
    .sort((a, b) => new Date(a) - new Date(b))
}

module.exports = { deduplicateSlots }
