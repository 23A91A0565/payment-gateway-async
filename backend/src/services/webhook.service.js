const pool = require('../db');
const webhookQueue = require('../queues/webhook.queue');

exports.buildWebhookPayload = (event, data) => ({
  event,
  timestamp: Math.floor(Date.now() / 1000),
  data
});

exports.enqueueWebhookIfConfigured = async ({ merchantId, event, payload }) => {
  const merchantResult = await pool.query(
    'SELECT webhook_url FROM merchants WHERE id = $1',
    [merchantId]
  );

  if (merchantResult.rows.length === 0 || !merchantResult.rows[0].webhook_url) {
    return null;
  }

  const insertResult = await pool.query(
    `INSERT INTO webhook_logs (merchant_id, event, payload, status, attempts)
     VALUES ($1, $2, $3, 'pending', 0)
     RETURNING id`,
    [merchantId, event, payload]
  );

  const webhookId = insertResult.rows[0].id;
  await webhookQueue.add({ webhookId });
  return webhookId;
};
