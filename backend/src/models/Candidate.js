const mongoose = require('mongoose')

const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  levelCode: { type: String, default: 'E1' },
  roleApplied: { type: String, required: true },
  resumeUrl: { type: String, required: true },
  jdUrl: { type: String, required: true },
  notes: { type: String, default: null },
  interviewStatus: { type: String, default: 'pending' },
  assignedPanelistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Panelist' },
  addedBy: String,
  addedOn: { type: Date, default: Date.now },
  outreachRetryCount: { type: Number, default: 0 },
  nextOutreachAt: { type: Date, default: null }
})

module.exports = mongoose.model('Candidate', candidateSchema)
