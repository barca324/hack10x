const router = require('express').Router()
const multer = require('multer')
const isHR = require('../middlewares/isHR')
const roleGuard = require('../middlewares/roleGuard')
const {
  listCandidates, addCandidate, bulkUpload,
  getCandidate, editCandidate, deleteCandidate
} = require('../controllers/candidate.controller')

const upload = multer({ dest: 'uploads/' })

// All candidate routes require HR session + role guard
router.use(isHR, roleGuard)

router.get('/', listCandidates)
router.post('/', addCandidate)                          // triggers Workflow 1
router.post('/bulk', upload.single('file'), bulkUpload) // CSV bulk upload → Workflow 1 per row
router.get('/:id', getCandidate)
router.patch('/:id', editCandidate)
router.delete('/:id', deleteCandidate)

module.exports = router
