module.exports = (req, res, next) => {
  if (req.user?.email !== process.env.SUPER_ADMIN_EMAIL)
    return res.status(403).json({ error: 'Forbidden' })
  next()
}
