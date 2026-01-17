const paymentQueue = require('../queues/payment.queue');
const webhookQueue = require('../queues/webhook.queue');
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');

paymentQueue.process(async (job) => {
  const { paymentId, amount, currency } = job.data;

  // Simulate processing delay (2–4 sec)
  await new Promise((r) => setTimeout(r, 3000));

  // Simulate outcome (80% success)
  const isSuccess = Math.random() < 0.8;
  const status = isSuccess ? 'success' : 'failed';

  // Update payment status
  await pool.query(
    'UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2',
    [status, paymentId]
  );

  // Prepare webhook
  const event = isSuccess ? 'payment.success' : 'payment.failed';

  const payload = {
    paymentId,
    amount,
    currency,
    status
  };

  const webhookId = uuidv4();

  // Insert webhook log
  await pool.query(
    `INSERT INTO webhook_logs
     (id, event, payload, status, attempts)
     VALUES ($1, $2, $3, $4, 0)`,
    [webhookId, event, payload, 'pending']
  );

  // Enqueue webhook delivery
  await webhookQueue.add({
    webhookId
  });
});
