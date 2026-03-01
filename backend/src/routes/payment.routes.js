const express = require('express');
const router = express.Router();

const { createPayment, capturePayment } = require('../controllers/payment.controller');
const { requireMerchantAuth } = require('../middleware/auth.middleware');

router.post('/payments', requireMerchantAuth, createPayment);
router.post('/payments/:paymentId/capture', requireMerchantAuth, capturePayment);

module.exports = router;
