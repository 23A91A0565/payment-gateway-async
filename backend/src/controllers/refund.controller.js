const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const refundQueue = require('../queues/refund.queue');

exports.createRefund = async (req, res) => {
  try {
    const { paymentId, amount } = req.body;

    if (!paymentId || !amount) {
      return res.status(400).json({ error: 'paymentId and amount required' });
    }
    const paymentRes = await pool.query(
      'SELECT amount, status FROM payments WHERE id = $1',
      [paymentId]
    );

    if (paymentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (paymentRes.rows[0].status !== 'success') {
      return res.status(400).json({ error: 'Refund allowed only for successful payments' });
    }
    const refundSum = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM refunds WHERE payment_id = $1',
      [paymentId]
    );

    const alreadyRefunded = Number(refundSum.rows[0].total);
    const paymentAmount = Number(paymentRes.rows[0].amount);

    if (alreadyRefunded + amount > paymentAmount) {
      return res.status(400).json({ error: 'Refund amount exceeds payment amount' });
    }
    const refundId = uuidv4();

    await pool.query(
      `INSERT INTO refunds (id, payment_id, amount, status)
       VALUES ($1, $2, $3, 'pending')`,
      [refundId, paymentId, amount]
    );
    await refundQueue.add({ refundId });

    return res.status(201).json({
      refundId,
      status: 'pending'
    });

  } catch (err) {
    console.error('Refund error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
