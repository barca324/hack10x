const Candidate = require('../models/Candidate')
const { runOutreachWorkflow } = require('../services/outreach.service')
const { parseBulkCSV } = require('../utils/bulkUpload')

const hasRole = (hrRoles, role) => hrRoles.includes('*') || hrRoles.includes(role)

function normalize(c) {
  return {
    id: c._id,
    name: c.name,
    email: c.email,
    phone: c.phone || null,
    level_code: c.levelCode || 'E1',
    role_applied: c.roleApplied,
    resume_url: c.resumeUrl || null,
    jd_url: c.jdUrl || null,
    notes: c.notes || null,
    status: (c.interviewStatus || 'pending').toLowerCase(),
    added_on: c.addedOn,
    added_by: c.addedBy || null,
  }
}

exports.listCandidates = async (req, res, next) => {
  try {
    const filter = req.hrRoles.includes('*') ? {} : { roleApplied: { $in: req.hrRoles } }
    const candidates = await Candidate.find(filter).sort({ addedOn: -1 })
    res.json(candidates.map(normalize))
  } catch (err) { next(err) }
}

exports.addCandidate = async (req, res, next) => {
  try {
    // Accept both camelCase and snake_case from the request
    const name = req.body.name
    const email = req.body.email
    const roleApplied = req.body.roleApplied || req.body.role_applied
    const resumeUrl = req.body.resumeUrl || req.body.resume_url || null
    const jdUrl = req.body.jdUrl || req.body.jd_url || null
    const phone = req.body.phone || null
    const levelCode = req.body.levelCode || req.body.level_code || 'E1'
    const notes = req.body.notes || null

    if (!roleApplied) return res.status(400).json({ error: 'role_applied is required' })
    if (!phone) return res.status(400).json({ error: 'phone is required' })
    if (!resumeUrl) return res.status(400).json({ error: 'resume_url is required' })
    if (!jdUrl) return res.status(400).json({ error: 'jd_url is required' })
    if (!hasRole(req.hrRoles, roleApplied))
      return res.status(403).json({ error: 'You are not responsible for this role' })

    const candidate = await Candidate.create({
      name, email, phone, levelCode, roleApplied, resumeUrl, jdUrl, notes,
      addedBy: req.user.email,
    })

    runOutreachWorkflow(candidate).catch(err =>
      console.error('Outreach workflow error:', err)
    )

    res.status(201).json(normalize(candidate))
  } catch (err) { next(err) }
}

exports.bulkUpload = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'CSV file required' })

    const rows = await parseBulkCSV(req.file.path)
    const results = []

    for (const row of rows) {
      const roleApplied = row.roleApplied || row.role_applied
      if (!hasRole(req.hrRoles, roleApplied)) {
        results.push({ email: row.email, status: 'skipped', reason: 'Role not in HR responsibility' })
        continue
      }
      try {
        const candidate = await Candidate.create({ ...row, roleApplied, addedBy: req.user.email })
        runOutreachWorkflow(candidate).catch(err =>
          console.error(`Outreach workflow error for ${candidate.email}:`, err)
        )
        results.push({ email: row.email, status: 'created', id: candidate._id })
      } catch (e) {
        results.push({ email: row.email, status: 'error', reason: e.message })
      }
    }

    res.json({ processed: rows.length, results })
  } catch (err) { next(err) }
}

exports.getCandidate = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id).populate('assignedPanelistId')
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' })
    if (!hasRole(req.hrRoles, candidate.roleApplied))
      return res.status(403).json({ error: 'Forbidden' })
    res.json(normalize(candidate))
  } catch (err) { next(err) }
}

exports.editCandidate = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' })
    if (!hasRole(req.hrRoles, candidate.roleApplied))
      return res.status(403).json({ error: 'Forbidden' })
    Object.assign(candidate, req.body)
    await candidate.save()
    res.json(normalize(candidate))
  } catch (err) { next(err) }
}

exports.deleteCandidate = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' })
    if (!hasRole(req.hrRoles, candidate.roleApplied))
      return res.status(403).json({ error: 'Forbidden' })
    await candidate.deleteOne()
    res.json({ message: 'Candidate removed' })
  } catch (err) { next(err) }
}
