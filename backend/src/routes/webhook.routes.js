const express = require('express');
const router = express.Router();

const {
  getWebhookLogs,
  retryWebhook,
  saveWebhookConfig,
  sendTestWebhook
} = require('../controllers/webhook.controller');

router.get('/webhooks/logs', getWebhookLogs);
router.post('/webhooks/:id/retry', retryWebhook);
router.post('/webhooks/config', saveWebhookConfig);
router.post('/webhooks/test', sendTestWebhook);

module.exports = router;
