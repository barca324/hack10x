const mongoose = require('mongoose')

const slotPoolSchema = new mongoose.Schema({
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
  outreachRoundId: { type: String, required: true }, // UUID; groups all panelist outreach for this candidate
  slots: [
    {
      time: Date,             // e.g. 2026-05-16T10:00:00Z
      panelistIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Panelist' }]
    }
  ],
  status: {
    type: String,
    default: 'awaiting_panelists'
    // awaiting_panelists | awaiting_candidate | booked
  },
  candidateOutreachAfter: Date, // set at outreach time; scheduler sends candidate email after this
  candidateToken: String,       // UUID sent to candidate when scheduler fires
  candidateTokenStatus: { type: String, default: 'PENDING' }, // PENDING | RESPONDED
  candidateTokenExpiresAt: Date,
  createdAt: { type: Date, default: Date.now }
  // status values: awaiting_panelists | awaiting_candidate | booked | no_slots
})

module.exports = mongoose.model('SlotPool', slotPoolSchema)
