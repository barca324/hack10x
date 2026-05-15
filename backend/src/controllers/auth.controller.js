exports.me = (req, res) => {
  const { email, role, name, hrRoles } = req.user
  res.json({ email, role, name, hrRoles })
}

exports.logout = (req, res, next) => {
  req.logout(err => {
    if (err) return next(err)
    req.session.destroy(() => res.json({ message: 'Logged out successfully' }))
  })
}
