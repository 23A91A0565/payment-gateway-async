const express = require('express');
const router = express.Router();
const { getJobsStatus } = require('../controllers/test.controller');

router.get('/test/jobs/status', getJobsStatus);

module.exports = router;
