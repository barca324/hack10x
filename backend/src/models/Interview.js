const mongoose = require('mongoose')

const interviewSchema = new mongoose.Schema({
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
  panelistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Panelist', required: true },
  scheduledAt: Date,          // chosen slot datetime
  interviewSlot: String,      // human-readable e.g. "4-5 pm"
  status: { type: String, default: 'Pending' }, // Pending | Done | Cancelled
  selected: { type: Boolean, default: null },   // true | false | null (not yet decided)
  roleApplied: String,
  meetLink: String,
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Interview', interviewSchema)
