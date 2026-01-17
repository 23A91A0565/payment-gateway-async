const axios = require('axios');
const crypto = require('crypto');
const pool = require('../db');
const webhookQueue = require('../queues/webhook.queue');
const { getNextRetryDelay } = require('../utils/webhookRetry');
const { getWebhookConfig } = require('../controllers/webhook.controller');

webhookQueue.process(async (job) => {
  const { webhookId } = job.data;

  const { rows } = await pool.query(
    'SELECT * FROM webhook_logs WHERE id = $1',
    [webhookId]
  );

  if (rows.length === 0) return;

  const log = rows[0];
  const payload = log.payload;

  const { url, secret } = getWebhookConfig();

  const body = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  try {
    const res = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature
      },
      timeout: 5000
    });

    await pool.query(
      `UPDATE webhook_logs
       SET status = 'success',
           attempts = attempts + 1,
           last_attempt_at = NOW(),
           response_code = $1
       WHERE id = $2`,
      [res.status, webhookId]
    );

  } catch (err) {
    const attempts = log.attempts + 1;
    const delay = getNextRetryDelay(attempts);

    if (delay === null) {
      await pool.query(
        `UPDATE webhook_logs
         SET status = 'failed',
             attempts = $1,
             last_attempt_at = NOW()
         WHERE id = $2`,
        [attempts, webhookId]
      );
      return;
    }

    await pool.query(
      `UPDATE webhook_logs
       SET attempts = $1,
           last_attempt_at = NOW(),
           next_retry_at = NOW() + INTERVAL '${delay} seconds'
       WHERE id = $2`,
      [attempts, webhookId]
    );

    await webhookQueue.add(
      { webhookId },
      { delay: delay * 1000 }
    );
  }
});
