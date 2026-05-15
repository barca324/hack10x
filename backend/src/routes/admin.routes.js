const router = require('express').Router()
const isHR = require('../middlewares/isHR')
const isAdmin = require('../middlewares/isAdmin')
const {
  listHR, addHR, editHR, toggleHR, deleteHR,
  listPanelists, addPanelist, editPanelist, deletePanelist
} = require('../controllers/admin.controller')

// All admin routes require admin session
router.use(isHR, isAdmin)

// HR management
router.get('/hr', listHR)
router.post('/hr', addHR)
router.patch('/hr/:id', editHR)
router.patch('/hr/:id/toggle', toggleHR)
router.delete('/hr/:id', deleteHR)

// Panelist management
router.get('/panelists', listPanelists)
router.post('/panelists', addPanelist)       // triggers Workflow 5 (calendar auth email)
router.patch('/panelists/:id', editPanelist)
router.delete('/panelists/:id', deletePanelist)

module.exports = router
