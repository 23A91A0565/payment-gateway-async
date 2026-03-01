const axios = require('axios');
const crypto = require('crypto');
const pool = require('../db');
const webhookQueue = require('../queues/webhook.queue');
const { getNextRetryDelay } = require('../utils/webhookRetry');

webhookQueue.process(async (job) => {
  const { webhookId } = job.data;

  const { rows } = await pool.query(
    `SELECT id, merchant_id, payload, attempts
     FROM webhook_logs
     WHERE id = $1`,
    [webhookId]
  );

  if (rows.length === 0) return;

  const log = rows[0];
  const payload = log.payload;

  const merchantResult = await pool.query(
    `SELECT webhook_url, webhook_secret
     FROM merchants
     WHERE id = $1`,
    [log.merchant_id]
  );

  if (merchantResult.rows.length === 0) {
    return;
  }

  const merchant = merchantResult.rows[0];
  if (!merchant.webhook_url || !merchant.webhook_secret) {
    return;
  }

  const body = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', merchant.webhook_secret)
    .update(body)
    .digest('hex');

  try {
    const res = await axios.post(merchant.webhook_url, body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature
      },
      timeout: 5000
    });

    await pool.query(
      `UPDATE webhook_logs
       SET status = 'success',
           attempts = attempts + 1,
           last_attempt_at = NOW(),
           response_code = $1,
           response_body = $2,
           next_retry_at = NULL
       WHERE id = $2`,
      [res.status, typeof res.data === 'string' ? res.data : JSON.stringify(res.data), webhookId]
    );

  } catch (err) {
    const attempts = log.attempts + 1;
    const delay = getNextRetryDelay(attempts);
    const responseCode = err.response?.status || null;
    const responseBody = err.response?.data
      ? (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data))
      : (err.message || null);

    if (delay === null) {
      await pool.query(
        `UPDATE webhook_logs
         SET status = 'failed',
             attempts = $1,
             last_attempt_at = NOW(),
             response_code = $3,
             response_body = $4,
             next_retry_at = NULL
         WHERE id = $2`,
        [attempts, webhookId, responseCode, responseBody]
      );
      return;
    }

    await pool.query(
      `UPDATE webhook_logs
       SET status = 'pending',
         attempts = $1,
         response_code = $3,
         response_body = $4,
           last_attempt_at = NOW(),
           next_retry_at = NOW() + INTERVAL '${delay} seconds'
       WHERE id = $2`,
      [attempts, webhookId, responseCode, responseBody]
    );

    await webhookQueue.add(
      { webhookId },
      { delay: delay * 1000 }
    );
  }
});
