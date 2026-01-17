const pool = require('../db');
const webhookQueue = require('../queues/webhook.queue');
const { v4: uuidv4 } = require('uuid');
let webhookConfig = {
  url: 'http://host.docker.internal:4000/webhook',
  secret: 'whsec_test_abc123'
};
exports.getWebhookLogs = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, event, status, attempts
       FROM webhook_logs
       ORDER BY created_at DESC
       LIMIT 50`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load webhook logs' });
  }
};
exports.retryWebhook = async (req, res) => {
  try {
    const { id } = req.params;

    const { rowCount } = await pool.query(
      `UPDATE webhook_logs
       SET status = 'pending'
       WHERE id = $1`,
      [id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    await webhookQueue.add({ webhookId: id });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Retry failed' });
  }
};

exports.saveWebhookConfig = async (req, res) => {
  res.json({ success: true });
};

exports.sendTestWebhook = async (req, res) => {
  const webhookId = uuidv4();

  await pool.query(
    `INSERT INTO webhook_logs (id, event, payload, status)
     VALUES ($1, 'webhook.test', '{}'::jsonb, 'pending')`,
    [webhookId]
  );

  await webhookQueue.add({ webhookId });

  res.json({ success: true });
};
exports.saveWebhookConfig = async (req, res) => {
  const { webhookUrl } = req.body;

  if (webhookUrl) {
    webhookConfig.url = webhookUrl;
  }

  res.json({ success: true });
};
exports.getWebhookConfig = () => webhookConfig;


