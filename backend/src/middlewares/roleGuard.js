const HR = require('../models/HR')

// Attaches req.hrRoles; candidate routes filter by this
module.exports = async (req, res, next) => {
  try {
    // Super-admin bypasses role guard — can access all roles
    if (req.user?.role === 'admin') {
      req.hrRoles = ['*'] // wildcard — all roles allowed
      return next()
    }

    const hr = await HR.findOne({ email: req.user.email, isActive: true })
    if (!hr) return res.status(403).json({ error: 'HR account inactive' })
    req.hrRoles = hr.rolesResponsibleFor
    next()
  } catch (err) {
    next(err)
  }
}
