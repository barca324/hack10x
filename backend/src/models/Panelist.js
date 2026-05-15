const mongoose = require('mongoose')

const panelistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  empId: String,
  position: String,
  email: { type: String, unique: true, required: true }, // @indiamart.com
  eligibleFor: [String], // e.g. ["Associate Engineer", "AI Engineer Intern"]
  authStatus: { type: Boolean, default: false },
  calendarToken: Object, // AES-256-GCM encrypted Google OAuth tokens
  authLinkToken: String, // signed JWT emailed to panelist (24h expiry)
  authLinkExpiresAt: Date,
  lastAssignedAt: { type: Date, default: null }, // null = never assigned = highest priority
  totalInterviewed: { type: Number, default: 0 },
  totalSelected: { type: Number, default: 0 },
  // selectionPct computed on read: (totalSelected / totalInterviewed) * 100
  addedOn: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Panelist', panelistSchema)
