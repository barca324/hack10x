const { google } = require('googleapis')
const { v4: uuidv4 } = require('uuid')
const { encrypt, decrypt } = require('./crypto.service')
const Panelist = require('../models/Panelist')

/**
 * Build an authenticated OAuth2 client for a panelist.
 * Automatically refreshes the access token if expired and saves the updated token.
 */
async function getAuthenticatedClient(panelist) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI
  )

  const tokens = JSON.parse(decrypt(panelist.calendarToken))

  // Refresh if expired
  if (tokens.expiry_date < Date.now()) {
    oauth2Client.setCredentials({ refresh_token: tokens.refresh_token })
    const { credentials } = await oauth2Client.refreshAccessToken()
    panelist.calendarToken = encrypt(JSON.stringify(credentials))
    await panelist.save()
    oauth2Client.setCredentials(credentials)
  } else {
    oauth2Client.setCredentials(tokens)
  }

  return oauth2Client
}

/**
 * Query Google Calendar freebusy for a panelist over the next N days (9am–6pm IST).
 * Returns array of free 1-hour slot Date objects.
 */
async function getFreeSlotsForPanelist(panelist) {
  const auth = await getAuthenticatedClient(panelist)
  const calendar = google.calendar({ version: 'v3', auth })

  const lookahead = parseInt(process.env.SLOT_LOOKAHEAD_DAYS || '3')
  const now = new Date()
  const timeMax = new Date(now)
  timeMax.setDate(timeMax.getDate() + lookahead)

  const freeBusyRes = await calendar.freebusy.query({
    requestBody: {
      timeMin: now.toISOString(),
      timeMax: timeMax.toISOString(),
      timeZone: 'Asia/Kolkata',
      items: [{ id: panelist.email }]
    }
  })

  const busyBlocks = freeBusyRes.data.calendars[panelist.email]?.busy || []
  return computeFreeSlots(busyBlocks, now, timeMax)
}

/**
 * Invert busy blocks within 9am–7pm IST window (Mon–Fri only)
 * to produce free 1-hour slots.
 */
function computeFreeSlots(busyBlocks, rangeStart, rangeEnd) {
  const freeSlots = []
  const IST_OFFSET = 5.5 * 60 * 60 * 1000 // milliseconds

  let cursor = new Date(rangeStart)
  // Round up to the next whole hour
  cursor.setMinutes(0, 0, 0)
  cursor = new Date(cursor.getTime() + 60 * 60 * 1000)

  const sortedBusy = busyBlocks
    .map(b => ({ start: new Date(b.start), end: new Date(b.end) }))
    .sort((a, b) => a.start - b.start)

  while (cursor < rangeEnd) {
    const istTime = new Date(cursor.getTime() + IST_OFFSET)
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

/**
 * Insert a Google Calendar event on a panelist's calendar.
 */
async function insertCalendarEvent(panelist, { candidate, scheduledAt }) {
  const auth = await getAuthenticatedClient(panelist)
  const calendar = google.calendar({ version: 'v3', auth })

  const endAt = new Date(scheduledAt.getTime() + 60 * 60 * 1000)

  const descLines = [`Resume: ${candidate.resumeUrl}`]
  if (candidate.jdUrl) descLines.push(`JD: ${candidate.jdUrl}`)

  const response = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    requestBody: {
      summary: `Interview – ${candidate.name} for ${candidate.roleApplied}`,
      start: { dateTime: scheduledAt.toISOString(), timeZone: 'Asia/Kolkata' },
      end:   { dateTime: endAt.toISOString(),       timeZone: 'Asia/Kolkata' },
      description: descLines.join('\n'),
      conferenceData: {
        createRequest: {
          requestId: uuidv4(),
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    }
  })

  let meetLink = extractMeetLink(response.data)

  // Google sometimes populates conferenceData asynchronously — fetch the event once to confirm
  if (!meetLink) {
    const eventId = response.data.id
    const fetched = await calendar.events.get({ calendarId: 'primary', eventId })
    meetLink = extractMeetLink(fetched.data)
  }

  if (!meetLink) {
    console.warn(`Meet link not created for event ${response.data.id} (panelist: ${panelist.email}). Workspace Meet may not be enabled.`)
  }

  return meetLink
}

function extractMeetLink(eventData) {
  return eventData.conferenceData?.entryPoints
    ?.find(e => e.entryPointType === 'video')?.uri || null
}

module.exports = { getFreeSlotsForPanelist, insertCalendarEvent }
