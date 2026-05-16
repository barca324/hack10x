const HR = require('../models/HR')
const Panelist = require('../models/Panelist')
const { sendCalendarAuthEmail } = require('../services/email.service')
const jwt = require('jsonwebtoken')

// ── HR Management ─────────────────────────────────────────────────────────────

exports.listHR = async (req, res, next) => {
  try {
    const hrs = await HR.find().select('name email designation rolesResponsibleFor role isActive addedBy createdAt')
    res.json(hrs)
  } catch (err) { next(err) }
}

exports.addHR = async (req, res, next) => {
  try {
    const { name, email, designation, rolesResponsibleFor, role } = req.body
    if (!email.endsWith('@indiamart.com'))
      return res.status(400).json({ error: 'Email must be @indiamart.com' })
    const safeRole = role === 'admin' ? 'admin' : 'hr'
    const hr = await HR.create({ name, email, designation, rolesResponsibleFor, role: safeRole, addedBy: req.user.email })
    res.status(201).json(hr)
  } catch (err) { next(err) }
}

exports.editHR = async (req, res, next) => {
  try {
    const hr = await HR.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!hr) return res.status(404).json({ error: 'HR not found' })
    res.json(hr)
  } catch (err) { next(err) }
}

exports.toggleHR = async (req, res, next) => {
  try {
    const hr = await HR.findById(req.params.id)
    if (!hr) return res.status(404).json({ error: 'HR not found' })
    hr.isActive = !hr.isActive
    await hr.save()
    res.json({ isActive: hr.isActive })
  } catch (err) { next(err) }
}

exports.deleteHR = async (req, res, next) => {
  try {
    await HR.findByIdAndDelete(req.params.id)
    res.json({ message: 'HR removed' })
  } catch (err) { next(err) }
}

// ── Panelist Management ───────────────────────────────────────────────────────

exports.listPanelists = async (req, res, next) => {
  try {
    const panelists = await Panelist.find().lean()
    // Compute selectionPct on read
    const result = panelists.map(p => ({
      ...p,
      selectionPct: p.totalInterviewed > 0
        ? ((p.totalSelected / p.totalInterviewed) * 100).toFixed(0)
        : '0'
    }))
    res.json(result)
  } catch (err) { next(err) }
}

exports.addPanelist = async (req, res, next) => {
  try {
    const { name, empId, position, email, eligibleFor } = req.body
    if (!email.endsWith('@indiamart.com'))
      return res.status(400).json({ error: 'Email must be @indiamart.com' })

    const panelist = await Panelist.create({ name, empId, position, email, eligibleFor })

    // Workflow 5: Generate JWT and send calendar auth email
    const token = jwt.sign({ panelistId: panelist._id }, process.env.JWT_SECRET, { expiresIn: '24h' })
    panelist.authLinkToken = token
    panelist.authLinkExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await panelist.save()

    await sendCalendarAuthEmail(panelist, token)

    res.status(201).json(panelist)
  } catch (err) { next(err) }
}

exports.editPanelist = async (req, res, next) => {
  try {
    const panelist = await Panelist.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!panelist) return res.status(404).json({ error: 'Panelist not found' })
    res.json(panelist)
  } catch (err) { next(err) }
}

exports.deletePanelist = async (req, res, next) => {
  try {
    await Panelist.findByIdAndDelete(req.params.id)
    res.json({ message: 'Panelist removed' })
  } catch (err) { next(err) }
}
