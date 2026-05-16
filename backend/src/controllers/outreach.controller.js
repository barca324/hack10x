const OutreachLog = require('../models/OutreachLog')
const { handlePanelistResponse } = require('../services/slotPool.service')
const { confirmBooking } = require('../services/booking.service')

// GET /api/outreach/panelist-respond?token=TOKEN&slot=n&action=confirm|decline
exports.panelistRespond = async (req, res) => {
  const { token, action, slot, reason } = req.query

  if (!token || !action)
    return res.send(htmlPage('Bad Request', 'Invalid link. Missing required parameters.'))

  try {
    const log = await OutreachLog.findOne({ outreachToken: token })
    if (!log)
      return res.send(htmlPage('Invalid Link', 'This link is not recognized.'))

    if (log.tokenExpiresAt < new Date())
      return res.send(htmlPage('Link Expired', 'This availability link has expired. No action needed.'))

    // Atomic lock — only process once
    const updated = await OutreachLog.findOneAndUpdate(
      { outreachToken: token, tokenStatus: 'PENDING' },
      { tokenStatus: 'RESPONDED', respondedAt: new Date(), response: action, declineReason: reason || null }
    )

    if (!updated)
      return res.send(htmlPage('Already Responded', 'You have already responded to this request. No further action needed.'))

    if (action === 'confirm') {
      const confirmedSlots = req.query.slots
        ? (Array.isArray(req.query.slots) ? req.query.slots : [req.query.slots]).map(s => new Date(s))
        : []

      await OutreachLog.findByIdAndUpdate(updated._id, { confirmedSlots })
      const { skippedSlots, acceptedSlots } = await handlePanelistResponse(log, confirmedSlots)

      if (skippedSlots.length > 0) {
        const allSkipped = acceptedSlots.length === 0
        if (allSkipped) {
          return res.send(htmlPage(
            'Slots Already Booked',
            `None of your selected slots could be recorded — they are already committed to another interview.<br><br>Please contact HR if you believe this is a mistake.`
          ))
        }
        return res.send(htmlPage(
          'Partially Recorded',
          `The following slot(s) have been successfully recorded:<br><br>${slotsTable(acceptedSlots)}` +
          `<br>The following slot(s) were already booked:<br><br>${slotsTable(skippedSlots)}`
        ))
      }

      return res.send(htmlPage(
        'Thank You',
        `Your availability has been recorded. We will get back to you with the confirmed schedule.` +
        (acceptedSlots.length ? `<br><br><strong>Your selected slot(s):</strong><br><br>${slotsTable(acceptedSlots)}` : '')
      ))
    }

    // Declined
    return res.send(htmlPage('Response Recorded', 'You have declined this request. No action needed.'))
  } catch (err) {
    console.error('panelistRespond error:', err)
    res.send(htmlPage('Error', 'Something went wrong. Please try again.'))
  }
}

// GET /api/outreach/candidate-respond?token=TOKEN&slot=n
exports.candidateRespond = async (req, res) => {
  const { token, slot } = req.query

  if (!token || slot === undefined)
    return res.send(htmlPage('Bad Request', 'Invalid link. Missing required parameters.'))

  try {
    await confirmBooking(token, parseInt(slot))
    res.send(htmlPage('Interview Booked', 'Your interview has been scheduled. Check your email for details.'))
  } catch (err) {
    if (err.message === 'EXPIRED')
      return res.send(htmlPage('Link Expired', 'This slot selection link has expired. Please contact HR.'))
    if (err.message === 'ALREADY_BOOKED')
      return res.send(htmlPage('Already Selected', 'A slot has already been selected. No further action needed.'))
    if (err.message === 'SLOT_UNAVAILABLE')
      return res.send(htmlPage('Slot No Longer Available', 'This slot has just been taken by another booking. Please go back to the email we sent you and select a different slot.'))
    console.error('candidateRespond error:', err)
    res.send(htmlPage('Error', 'Something went wrong. Please contact HR.'))
  }
}

function slotsTable(slots) {
  const rows = slots.map((d, i) => {
    const date = d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
    const timeStart = d.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
    const timeEnd = new Date(d.getTime() + 60 * 60 * 1000).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
    const bg = i % 2 === 0 ? '#ffffff' : '#f9f9f9'
    return `<tr style="background:${bg}">
      <td style="padding:10px 18px;border:1px solid #e5e7eb">${date}</td>
      <td style="padding:10px 18px;border:1px solid #e5e7eb">${timeStart} – ${timeEnd}</td>
    </tr>`
  }).join('')
  return `<table style="border-collapse:collapse;margin:0 auto;min-width:320px">
    <thead>
      <tr style="background:#f3f4f6">
        <th style="padding:10px 18px;border:1px solid #e5e7eb;font-size:13px">Date</th>
        <th style="padding:10px 18px;border:1px solid #e5e7eb;font-size:13px">Time</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`
}

function htmlPage(title, message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; background: #f0f4ff; }
    .card { background: #fff; padding: 2rem 3rem; border-radius: 12px;
            box-shadow: 0 2px 16px rgba(0,0,0,.1); text-align: center; max-width: 480px; }
    h1 { color: #1a1a2e; margin-bottom: .5rem; }
    p  { color: #555; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card"><h1>${title}</h1><p>${message}</p></div>
</body>
</html>`
}
