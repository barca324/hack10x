const mongoose = require('mongoose')

const hrSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true }, // must be @indiamart.com
  designation: String,
  rolesResponsibleFor: [String], // e.g. ["Associate Engineer", "AI Engineer Intern"]
  isActive: { type: Boolean, default: true },
  addedBy: String, // super-admin email
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('HR', hrSchema)
