const paymentQueue = require('../queues/payment.queue');
const pool = require('../db');
const { buildWebhookPayload, enqueueWebhookIfConfigured } = require('../services/webhook.service');

const getProcessingDelayMs = () => {
  if (String(process.env.TEST_MODE).toLowerCase() === 'true') {
    return Number(process.env.TEST_PROCESSING_DELAY || 1000);
  }

  return Math.floor(Math.random() * 5001) + 5000;
};

const getPaymentSuccess = (method) => {
  if (String(process.env.TEST_MODE).toLowerCase() === 'true') {
    const flag = process.env.TEST_PAYMENT_SUCCESS;
    return flag === undefined ? true : String(flag).toLowerCase() === 'true';
  }

  const normalizedMethod = String(method || '').toLowerCase();
  if (normalizedMethod === 'upi') {
    return Math.random() < 0.9;
  }

  if (normalizedMethod === 'card') {
    return Math.random() < 0.95;
  }

  return Math.random() < 0.9;
};

paymentQueue.process(async (job) => {
  const { paymentId } = job.data;

  const paymentResult = await pool.query(
    `SELECT id, merchant_id, order_id, amount, currency, method, vpa, created_at
     FROM payments
     WHERE id = $1`,
    [paymentId]
  );

  if (paymentResult.rows.length === 0) {
    return;
  }

  const payment = paymentResult.rows[0];

  await new Promise((resolve) => setTimeout(resolve, getProcessingDelayMs()));

  const isSuccess = getPaymentSuccess(payment.method);
  const status = isSuccess ? 'success' : 'failed';

  await pool.query(
    `UPDATE payments
     SET status = $1,
         error_code = $2,
         error_description = $3,
         updated_at = NOW()
     WHERE id = $4`,
    [
      status,
      isSuccess ? null : 'PAYMENT_FAILED',
      isSuccess ? null : 'Payment processing failed',
      paymentId
    ]
  );

  const event = isSuccess ? 'payment.success' : 'payment.failed';

  const payload = buildWebhookPayload(event, {
    payment: {
      id: payment.id,
      order_id: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      vpa: payment.vpa,
      status,
      created_at: payment.created_at
    }
  });

  await enqueueWebhookIfConfigured({
    merchantId: payment.merchant_id,
    event,
    payload
  });
});
