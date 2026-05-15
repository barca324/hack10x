const jwt = require('jsonwebtoken')
const { google } = require('googleapis')
const Panelist = require('../models/Panelist')
const { encrypt } = require('../services/crypto.service')

const getOAuth2Client = () => new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALENDAR_REDIRECT_URI
)

// GET /api/calendar/authorize?token={jwt}
// Validate JWT from email → redirect to Google OAuth
exports.authorize = (req, res) => {
  const { token } = req.query
  if (!token) return res.status(400).send(htmlPage('Bad Request', 'Missing token.'))

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return res.send(htmlPage('Link Expired', 'This link has expired. Please contact HR to resend.'))
  }

  // Store panelistId in session before redirecting to Google
  req.session.pendingPanelistId = payload.panelistId

  const oauth2Client = getOAuth2Client()
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ]
  })
  res.redirect(authUrl)
}

// GET /api/calendar/callback
// Google callback → encrypt + store tokens → authStatus = true
exports.callback = async (req, res) => {
  const { code } = req.query
  const panelistId = req.session.pendingPanelistId

  if (!panelistId)
    return res.send(htmlPage('Session Error', 'Session expired. Please use the email link again.'))

  try {
    const oauth2Client = getOAuth2Client()
    const { tokens } = await oauth2Client.getToken(code)
    // { access_token, refresh_token, expiry_date }

    const encrypted = encrypt(JSON.stringify(tokens))

    await Panelist.findByIdAndUpdate(panelistId, {
      calendarToken: encrypted,
      authStatus: true,
      authLinkToken: null
    })

    delete req.session.pendingPanelistId

    res.send(htmlPage(
      'Calendar Authorized ✅',
      "You're all set! Your calendar has been connected. You will now receive interview availability requests by email."
    ))
  } catch (err) {
    console.error('Calendar callback error:', err)
    res.send(htmlPage('Error', 'Something went wrong. Please try again or contact HR.'))
  }
}

function htmlPage(title, message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; background: #f5f5f5; }
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
