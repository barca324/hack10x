/**
 * parseSlots.js
 *
 * Invert Google Calendar busy blocks within 9am–7pm IST window (Mon–Fri only)
 * to produce free 1-hour slot Date objects.
 *
 * @param {Array<{start: string, end: string}>} busyBlocks - from freebusy API
 * @param {Date} rangeStart
 * @param {Date} rangeEnd
 * @returns {Date[]} array of free slot start times (each 1 hour long)
 */
function parseSlots(busyBlocks, rangeStart, rangeEnd) {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

  const sortedBusy = busyBlocks
    .map(b => ({ start: new Date(b.start), end: new Date(b.end) }))
    .sort((a, b) => a.start - b.start)

  const freeSlots = []

  // Start from the next whole hour after rangeStart
  let cursor = new Date(rangeStart)
  cursor.setMinutes(0, 0, 0)
  cursor = new Date(cursor.getTime() + 60 * 60 * 1000)

  while (cursor < rangeEnd) {
    const istTime = new Date(cursor.getTime() + IST_OFFSET_MS)
    const istHour = istTime.getUTCHours()
    const istDay  = istTime.getUTCDay() // 0=Sun, 6=Sat

    // Skip weekends
    if (istDay === 0 || istDay === 6) {
      cursor = new Date(cursor.getTime() + 60 * 60 * 1000)
      continue
    }

    // Only include slots that start between 9am and 6pm IST (last slot: 6pm–7pm)
    if (istHour >= 9 && istHour < 19) {
      const slotEnd = new Date(cursor.getTime() + 60 * 60 * 1000)
      const isBusy = sortedBusy.some(b => b.start < slotEnd && b.end > cursor)
      if (!isBusy) freeSlots.push(new Date(cursor))
    }

    cursor = new Date(cursor.getTime() + 60 * 60 * 1000)
  }

  return freeSlots
}

module.exports = { parseSlots }
