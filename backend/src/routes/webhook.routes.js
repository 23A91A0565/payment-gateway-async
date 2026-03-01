const express = require('express');
const router = express.Router();
const { requireMerchantAuth } = require('../middleware/auth.middleware');

const {
  getWebhookLogs,
  retryWebhook,
  getWebhookConfig,
  saveWebhookConfig,
  regenerateWebhookSecret,
  sendTestWebhook
} = require('../controllers/webhook.controller');

router.get('/webhooks', requireMerchantAuth, getWebhookLogs);
router.get('/webhooks/config', requireMerchantAuth, getWebhookConfig);
router.post('/webhooks/config', requireMerchantAuth, saveWebhookConfig);
router.post('/webhooks/config/regenerate-secret', requireMerchantAuth, regenerateWebhookSecret);
router.post('/webhooks/test', requireMerchantAuth, sendTestWebhook);
router.post('/webhooks/:webhookId/retry', requireMerchantAuth, retryWebhook);

module.exports = router;
