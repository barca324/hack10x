const mongoose = require('mongoose')

const outreachLogSchema = new mongoose.Schema({
  panelistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Panelist', required: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
  outreachRoundId: String,                          // links to SlotPool
  outreachToken: { type: String, unique: true },    // UUID in email link to panelist
  tokenStatus: { type: String, default: 'PENDING' }, // PENDING | RESPONDED
  sentAt: { type: Date, default: Date.now },
  emailSent: { type: Boolean, default: false },
  respondedVia: { type: String, default: 'email' },
  respondedAt: Date,
  response: String,           // "confirmed" | "declined"
  confirmedSlots: [Date],     // slots panelist said they are free for
  declineReason: String,
  tokenExpiresAt: Date        // sentAt + 48h
})

module.exports = mongoose.model('OutreachLog', outreachLogSchema)
