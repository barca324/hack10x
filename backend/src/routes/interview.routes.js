const router = require('express').Router()
const isHR = require('../middlewares/isHR')
const { listInterviews, scheduleInterview, updateInterview } = require('../controllers/interview.controller')

router.use(isHR)

router.get('/', listInterviews)
router.post('/schedule', scheduleInterview)
router.patch('/:id', updateInterview)

module.exports = router
