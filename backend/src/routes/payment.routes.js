const express = require('express');
const router = express.Router();

const { createPayment } = require('../controllers/payment.controller');

router.post('/payments', createPayment);

module.exports = router;
