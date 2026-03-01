const refundQueue = require('../queues/refund.queue');
const pool = require('../db');
const { buildWebhookPayload, enqueueWebhookIfConfigured } = require('../services/webhook.service');

const getRefundProcessingDelayMs = () => {
  return Math.floor(Math.random() * 2001) + 3000;
};

refundQueue.process(async (job) => {
  const { refundId } = job.data;

  await new Promise((resolve) => setTimeout(resolve, getRefundProcessingDelayMs()));

  const { rows } = await pool.query(
    `SELECT id, payment_id, merchant_id, amount, reason
     FROM refunds
     WHERE id = $1`,
    [refundId]
  );

  if (rows.length === 0) return;

  const refund = rows[0];

  const paymentResult = await pool.query(
    'SELECT id, amount, status FROM payments WHERE id = $1 AND merchant_id = $2',
    [refund.payment_id, refund.merchant_id]
  );

  if (paymentResult.rows.length === 0 || paymentResult.rows[0].status !== 'success') {
    return;
  }

  const sumResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM refunds
     WHERE payment_id = $1
       AND merchant_id = $2
       AND status IN ('pending', 'processed')`,
    [refund.payment_id, refund.merchant_id]
  );

  const totalRefunded = Number(sumResult.rows[0].total);
  const paymentAmount = Number(paymentResult.rows[0].amount);

  if (totalRefunded > paymentAmount) {
    return;
  }

  await pool.query(
    `UPDATE refunds
     SET status = 'processed',
         processed_at = NOW()
     WHERE id = $1`,
    [refundId]
  );

  const payload = buildWebhookPayload('refund.processed', {
    refund: {
      id: refund.id,
      payment_id: refund.payment_id,
      amount: refund.amount,
      reason: refund.reason,
      status: 'processed'
    }
  });

  await enqueueWebhookIfConfigured({
    merchantId: refund.merchant_id,
    event: 'refund.processed',
    payload
  });
});
