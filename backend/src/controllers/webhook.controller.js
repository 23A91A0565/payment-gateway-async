const crypto = require('crypto');
const pool = require('../db');
const webhookQueue = require('../queues/webhook.queue');
const { buildWebhookPayload, enqueueWebhookIfConfigured } = require('../services/webhook.service');

const generateWebhookSecret = () => `whsec_${crypto.randomBytes(12).toString('hex')}`;

exports.getWebhookLogs = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const limit = Number(req.query.limit || 10);
    const offset = Number(req.query.offset || 0);

    const listResult = await pool.query(
      `SELECT id, event, status, attempts, created_at, last_attempt_at, response_code
       FROM webhook_logs
       WHERE merchant_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [merchantId, limit, offset]
    );

    const totalResult = await pool.query(
      'SELECT COUNT(*)::int AS total FROM webhook_logs WHERE merchant_id = $1',
      [merchantId]
    );

    return res.status(200).json({
      data: listResult.rows,
      total: totalResult.rows[0].total,
      limit,
      offset
    });
  } catch (error) {
    console.error('Get webhook logs error:', error);
    return res.status(500).json({ error: 'Failed to load webhook logs' });
  }
};

exports.retryWebhook = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const { webhookId } = req.params;

    const updateResult = await pool.query(
      `UPDATE webhook_logs
       SET status = 'pending',
           attempts = 0,
           next_retry_at = NOW(),
           last_attempt_at = NULL,
           response_code = NULL,
           response_body = NULL
       WHERE id = $1 AND merchant_id = $2
       RETURNING id, status`,
      [webhookId, merchantId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    await webhookQueue.add({ webhookId });

    return res.status(200).json({
      id: updateResult.rows[0].id,
      status: updateResult.rows[0].status,
      message: 'Webhook retry scheduled'
    });
  } catch (error) {
    console.error('Retry webhook error:', error);
    return res.status(500).json({ error: 'Retry failed' });
  }
};

exports.getWebhookConfig = async (req, res) => {
  try {
    const merchantId = req.merchant.id;

    const { rows } = await pool.query(
      'SELECT webhook_url, webhook_secret FROM merchants WHERE id = $1',
      [merchantId]
    );

    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Get webhook config error:', error);
    return res.status(500).json({ error: 'Failed to load webhook configuration' });
  }
};

exports.saveWebhookConfig = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const { webhookUrl } = req.body;

    await pool.query(
      'UPDATE merchants SET webhook_url = $1 WHERE id = $2',
      [webhookUrl || null, merchantId]
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Save webhook config error:', error);
    return res.status(500).json({ error: 'Failed to save webhook configuration' });
  }
};

exports.regenerateWebhookSecret = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const webhookSecret = generateWebhookSecret();

    const { rows } = await pool.query(
      `UPDATE merchants
       SET webhook_secret = $1
       WHERE id = $2
       RETURNING webhook_secret`,
      [webhookSecret, merchantId]
    );

    return res.status(200).json({ webhook_secret: rows[0].webhook_secret });
  } catch (error) {
    console.error('Regenerate webhook secret error:', error);
    return res.status(500).json({ error: 'Failed to regenerate webhook secret' });
  }
};

exports.sendTestWebhook = async (req, res) => {
  try {
    const merchantId = req.merchant.id;

    const payload = buildWebhookPayload('webhook.test', {
      merchant: {
        id: merchantId
      }
    });

    const webhookId = await enqueueWebhookIfConfigured({
      merchantId,
      event: 'webhook.test',
      payload
    });

    if (!webhookId) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'Webhook URL is not configured'
        }
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Send test webhook error:', error);
    return res.status(500).json({ error: 'Failed to send test webhook' });
  }
};
