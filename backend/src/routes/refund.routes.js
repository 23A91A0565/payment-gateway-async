const express = require('express');
const router = express.Router();

const { createRefund, getRefund } = require('../controllers/refund.controller');
const { requireMerchantAuth } = require('../middleware/auth.middleware');

router.post('/payments/:paymentId/refunds', requireMerchantAuth, createRefund);
router.get('/refunds/:refundId', requireMerchantAuth, getRefund);

module.exports = router;
