const pool = require('../db');
const refundQueue = require('../queues/refund.queue');
const { generateRefundId } = require('../utils/ids');
const { buildWebhookPayload, enqueueWebhookIfConfigured } = require('../services/webhook.service');

exports.createRefund = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    if (!amount || !Number.isInteger(Number(amount))) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'amount is required and must be an integer'
        }
      });
    }

    const paymentRes = await pool.query(
      'SELECT id, amount, status FROM payments WHERE id = $1 AND merchant_id = $2',
      [paymentId, merchantId]
    );

    if (paymentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (paymentRes.rows[0].status !== 'success') {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'Refund allowed only for successful payments'
        }
      });
    }

    const refundSum = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM refunds
       WHERE payment_id = $1
         AND merchant_id = $2
         AND status IN ('pending', 'processed')`,
      [paymentId, merchantId]
    );

    const alreadyRefunded = Number(refundSum.rows[0].total);
    const paymentAmount = Number(paymentRes.rows[0].amount);
    const requestedAmount = Number(amount);

    if (requestedAmount > paymentAmount - alreadyRefunded) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'Refund amount exceeds available amount'
        }
      });
    }
    let refundId;
    let created = false;
    while (!created) {
      refundId = generateRefundId();
      try {
        await pool.query(
          `INSERT INTO refunds (id, payment_id, merchant_id, amount, reason, status)
           VALUES ($1, $2, $3, $4, $5, 'pending')`,
          [refundId, paymentId, merchantId, requestedAmount, reason || null]
        );
        created = true;
      } catch (error) {
        if (error.code !== '23505') {
          throw error;
        }
      }
    }

    await enqueueWebhookIfConfigured({
      merchantId,
      event: 'refund.created',
      payload: buildWebhookPayload('refund.created', {
        refund: {
          id: refundId,
          payment_id: paymentId,
          amount: requestedAmount,
          reason: reason || null,
          status: 'pending'
        }
      })
    });
    await refundQueue.add({ refundId });

    const createdRefund = await pool.query(
      `SELECT id, payment_id, amount, reason, status, created_at
       FROM refunds
       WHERE id = $1 AND merchant_id = $2`,
      [refundId, merchantId]
    );

    return res.status(201).json(createdRefund.rows[0]);

  } catch (err) {
    console.error('Refund error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getRefund = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const { refundId } = req.params;

    const { rows } = await pool.query(
      `SELECT id, payment_id, amount, reason, status, created_at, processed_at
       FROM refunds
       WHERE id = $1 AND merchant_id = $2`,
      [refundId, merchantId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Refund not found'
        }
      });
    }

    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Get refund error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
