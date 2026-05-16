const passport = require('passport')
const { Strategy: GoogleStrategy } = require('passport-google-oauth20')
const HR = require('../models/HR')

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value
    console.log('🔐 OAuth callback received')
    console.log('   email:', email)
    console.log('   SUPER_ADMIN_EMAIL:', process.env.SUPER_ADMIN_EMAIL)
    console.log('   match:', email === process.env.SUPER_ADMIN_EMAIL)

    if (!email) {
      console.log('   ❌ No email in profile')
      return done(null, false, { message: 'No email received from Google' })
    }

    // Enforce @indiamart.com domain
    if (!email.endsWith('@indiamart.com')) {
      console.log('   ❌ Domain check failed:', email)
      return done(null, false, { message: 'Only @indiamart.com accounts allowed' })
    }

    // Super-admin bypass
    if (email === process.env.SUPER_ADMIN_EMAIL) {
      console.log('   ✅ Super-admin login')
      return done(null, { email, role: 'admin', name: profile.displayName })
    }

    // HR whitelist check
    const hr = await HR.findOne({ email, isActive: true })
    if (!hr) {
      console.log('   ❌ Not in HR whitelist:', email)
      return done(null, false, { message: 'Not authorized. Contact admin.' })
    }

    console.log(`   ✅ ${hr.role === 'admin' ? 'Admin' : 'HR'} login:`, email)
    return done(null, {
      email,
      role: hr.role || 'hr',
      name: hr.name,
      hrRoles: hr.rolesResponsibleFor
    })
  } catch (err) {
    console.error('   ❌ Passport error:', err)
    return done(err)
  }
}))

passport.serializeUser((user, done) => done(null, user))
passport.deserializeUser((user, done) => done(null, user))
