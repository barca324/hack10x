const { Resend } = require('resend')

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.FROM_EMAIL || 'onboarding@resend.dev'

async function sendMail({ to, subject, html, bcc }) {
  await resend.emails.send({
    from: `Interview Scheduler <${FROM}>`,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    ...(bcc && { bcc: Array.isArray(bcc) ? bcc : [bcc] }),
  })
}

// ── Workflow 5: Panelist Calendar Auth ────────────────────────────────────────
async function sendCalendarAuthEmail(panelist, token) {
  const link = `${process.env.APP_BASE_URL}/api/calendar/authorize?token=${token}`
  await sendMail({
    to: panelist.email,
    subject: 'Action Required: Connect Your Google Calendar',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#1a1a2e">Hi ${panelist.name},</h2>
        <p>You have been added as an interview panelist. Please connect your Google Calendar so we can check your availability.</p>
        <p style="margin:24px 0">
          <a href="${link}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
            Connect Google Calendar
          </a>
        </p>
        <p style="color:#888;font-size:13px">This link expires in 24 hours. If you did not expect this email, please ignore it.</p>
      </div>`
  })
}

// ── Workflow 1: Panelist Outreach (check availability) ────────────────────────
async function sendPanelistOutreachEmail({ panelist, candidate, freeSlots, outreachToken }) {
  const base = `${process.env.APP_BASE_URL}/api/outreach/panelist-respond?token=${outreachToken}`
  const declineLink = `${base}&action=decline`

  const slotLinks = freeSlots.map((slot, i) => {
    const label = new Date(slot).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
    })
    const confirmLink = `${base}&action=confirm&slots=${encodeURIComponent(slot.toISOString())}`
    return `<li style="margin:8px 0">
      <strong>${label}</strong> — 
      <a href="${confirmLink}" style="color:#4f46e5;font-weight:600">I'm Available</a>
    </li>`
  }).join('')

  await sendMail({
    to: panelist.email,
    subject: `Interview Availability Request — ${candidate.name} (${candidate.roleApplied})`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#1a1a2e">Hi ${panelist.name},</h2>
        <p>We are scheduling an interview for <strong>${candidate.name}</strong> applying for <strong>${candidate.roleApplied}</strong>.</p>
        <p>Please confirm which of the following 1-hour slots you are available for:</p>
        <ul style="padding-left:16px">${slotLinks}</ul>
        <p style="margin-top:24px">
          <a href="${declineLink}" style="color:#dc2626;font-weight:600">I'm Not Available / Decline</a>
        </p>
        <p style="color:#888;font-size:13px">This link expires in 48 hours.</p>
      </div>`
  })
}

// ── Workflow 3: Candidate Slot Selection ──────────────────────────────────────
async function sendCandidateSlotEmail({ candidate, slots, candidateToken }) {
  const base = `${process.env.APP_BASE_URL}/api/outreach/candidate-respond?token=${candidateToken}`

  const slotLinks = slots.map((slot, i) => {
    const label = new Date(slot).toLocaleString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
    })
    return `<li style="margin:8px 0">
      <strong>${label}</strong> — 
      <a href="${base}&slot=${i}" style="background:#4f46e5;color:#fff;padding:6px 16px;border-radius:6px;text-decoration:none;font-size:14px">Select This Slot</a>
    </li>`
  }).join('')

  await sendMail({
    to: candidate.email,
    subject: `Interview Slot Selection — ${candidate.roleApplied}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#1a1a2e">Hi ${candidate.name},</h2>
        <p>We are pleased to invite you for an interview for the <strong>${candidate.roleApplied}</strong> position.</p>
        <p>Please select a time slot that works for you:</p>
        <ul style="padding-left:16px;list-style:none">${slotLinks}</ul>
        <p style="color:#888;font-size:13px">This link expires in 48 hours. Please respond at your earliest convenience.</p>
      </div>`
  })
}

// ── Workflow 4: Booking Confirmations ─────────────────────────────────────────
async function sendPanelistConfirmationEmail({ panelist, candidate, scheduledAt, meetLink }) {
  const dateStr = new Date(scheduledAt).toLocaleString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
  })
  const jdRow = candidate.jdUrl
    ? `<tr><td style="padding:8px;color:#555">JD</td><td style="padding:8px"><a href="${candidate.jdUrl}" style="color:#4f46e5">View JD</a></td></tr>`
    : ''
  const meetRow = meetLink
    ? `<tr><td style="padding:8px;color:#555">Meet Link</td><td style="padding:8px"><a href="${meetLink}" style="color:#4f46e5">${meetLink}</a></td></tr>`
    : ''
  await sendMail({
    to: panelist.email,
    bcc: candidate.addedBy || undefined,
    subject: `Interview Confirmed — ${candidate.name} (${candidate.roleApplied})`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#1a1a2e">Interview Scheduled</h2>
        <p>Hi ${panelist.name}, an interview has been booked on your calendar.</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0">
          <tr><td style="padding:8px;color:#555">Candidate</td><td style="padding:8px;font-weight:600">${candidate.name}</td></tr>
          <tr style="background:#f9f9f9"><td style="padding:8px;color:#555">Role</td><td style="padding:8px">${candidate.roleApplied}</td></tr>
          <tr><td style="padding:8px;color:#555">Date & Time</td><td style="padding:8px;font-weight:600">${dateStr}</td></tr>
          <tr style="background:#f9f9f9"><td style="padding:8px;color:#555">Resume</td><td style="padding:8px"><a href="${candidate.resumeUrl}" style="color:#4f46e5">View Resume</a></td></tr>
          ${jdRow}
          ${meetRow}
        </table>
        <p style="color:#888;font-size:13px">The event has been added to your Google Calendar.</p>
      </div>`
  })
}

async function sendCandidateConfirmationEmail({ candidate, scheduledAt, meetLink }) {
  const dateStr = new Date(scheduledAt).toLocaleString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
  })
  const meetRow = meetLink
    ? `<tr><td style="padding:8px;color:#555">Meet Link</td><td style="padding:8px"><a href="${meetLink}" style="color:#4f46e5;font-weight:600">${meetLink}</a></td></tr>`
    : ''
  await sendMail({
    to: candidate.email,
    bcc: candidate.addedBy || undefined,
    subject: `Interview Confirmed — ${candidate.roleApplied}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#1a1a2e">Your Interview is Confirmed</h2>
        <p>Hi ${candidate.name}, your interview has been scheduled!</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0">
          <tr><td style="padding:8px;color:#555">Role</td><td style="padding:8px;font-weight:600">${candidate.roleApplied}</td></tr>
          <tr style="background:#f9f9f9"><td style="padding:8px;color:#555">Date & Time</td><td style="padding:8px;font-weight:600">${dateStr}</td></tr>
          ${meetRow}
        </table>
        <p>Please be on time. Good Luck!</p>
      </div>`
  })
}

// ── Fallback: No Eligible Panelists Alert ─────────────────────────────────────
async function sendAdminAlertEmail({ candidate }) {
  const to = candidate.addedBy || process.env.SUPER_ADMIN_EMAIL
  const scheduleLink = `${process.env.FRONTEND_URL}/interviews`
  await sendMail({
    to,
    subject: `Action Required: No Panelists Available — ${candidate.name} (${candidate.roleApplied})`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#dc2626">No Panelists Available</h2>
        <p>No available panelists were found for <strong>${candidate.name}</strong> applying for <strong>${candidate.roleApplied}</strong>.</p>
        <p>Please contact a panelist directly and schedule the interview manually from the portal:</p>
        <p style="margin:24px 0">
          <a href="${scheduleLink}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
            Schedule Interview
          </a>
        </p>
      </div>`
  })
}

module.exports = {
  sendCalendarAuthEmail,
  sendPanelistOutreachEmail,
  sendCandidateSlotEmail,
  sendPanelistConfirmationEmail,
  sendCandidateConfirmationEmail,
  sendAdminAlertEmail
}
