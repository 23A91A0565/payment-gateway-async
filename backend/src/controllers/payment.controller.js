const pool = require('../db');
const paymentQueue = require('../queues/payment.queue');
const { generatePaymentId } = require('../utils/ids');
const { buildWebhookPayload, enqueueWebhookIfConfigured } = require('../services/webhook.service');

exports.createPayment = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const idempotencyKey = req.headers['idempotency-key'];

    const { amount, currency, order_id: orderId, method, vpa } = req.body;
    if (!amount || !currency) {
      return res.status(400).json({ error: 'amount and currency required' });
    }

    if (idempotencyKey) {
      const existing = await pool.query(
        `SELECT response, expires_at
         FROM idempotency_keys
         WHERE merchant_id = $1 AND key = $2`,
        [merchantId, idempotencyKey]
      );

      if (existing.rows.length > 0) {
        const record = existing.rows[0];
        if (new Date(record.expires_at) > new Date()) {
          return res.status(201).json(record.response);
        }

        await pool.query(
          'DELETE FROM idempotency_keys WHERE merchant_id = $1 AND key = $2',
          [merchantId, idempotencyKey]
        );
      }
    }

    const paymentId = generatePaymentId();

    const insertResult = await pool.query(
      `INSERT INTO payments (id, merchant_id, order_id, amount, currency, method, vpa, status, captured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', false)
       RETURNING created_at`,
      [paymentId, merchantId, orderId || null, amount, currency, method || null, vpa || null]
    );

    const createdAt = insertResult.rows?.[0]?.created_at;

    const response = {
      id: paymentId,
      order_id: orderId || null,
      amount,
      currency,
      method: method || null,
      vpa: vpa || null,
      status: 'pending',
      created_at: createdAt || new Date().toISOString()
    };

    if (idempotencyKey) {
      await pool.query(
        `INSERT INTO idempotency_keys (merchant_id, key, response, expires_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours')`,
        [merchantId, idempotencyKey, response]
      );
    }

    await paymentQueue.add({
      paymentId
    });

    await enqueueWebhookIfConfigured({
      merchantId,
      event: 'payment.created',
      payload: buildWebhookPayload('payment.created', {
        payment: response
      })
    });

    await enqueueWebhookIfConfigured({
      merchantId,
      event: 'payment.pending',
      payload: buildWebhookPayload('payment.pending', {
        payment: response
      })
    });

    return res.status(201).json(response);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.capturePayment = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const { paymentId } = req.params;
    const { amount } = req.body;

    const paymentResult = await pool.query(
      `SELECT id, order_id, amount, currency, method, status, captured, created_at
       FROM payments
       WHERE id = $1 AND merchant_id = $2`,
      [paymentId, merchantId]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Payment not found'
        }
      });
    }

    const payment = paymentResult.rows[0];

    if (payment.status !== 'success' || payment.captured) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'Payment not in capturable state'
        }
      });
    }

    if (amount && Number(amount) !== Number(payment.amount)) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'Capture amount must match payment amount'
        }
      });
    }

    const updateResult = await pool.query(
      `UPDATE payments
       SET captured = true, updated_at = NOW()
       WHERE id = $1 AND merchant_id = $2
       RETURNING id, order_id, amount, currency, method, status, captured, created_at, updated_at`,
      [paymentId, merchantId]
    );

    return res.status(200).json(updateResult.rows[0]);
  } catch (error) {
    console.error('Capture payment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
