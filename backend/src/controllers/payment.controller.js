const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const paymentQueue = require('../queues/payment.queue');

exports.createPayment = async (req, res) => {
  try {
    const idempotencyKey = req.headers['idempotency-key'];

    if (!idempotencyKey) {
      return res.status(400).json({ error: 'Idempotency-Key header required' });
    }

    const { amount, currency } = req.body;

    if (!amount || !currency) {
      return res.status(400).json({ error: 'amount and currency required' });
    }
    const existing = await pool.query(
      'SELECT response FROM idempotency_keys WHERE key = $1 AND expires_at > NOW()',
      [idempotencyKey]
    );

    if (existing.rows.length > 0) {
      return res.json(existing.rows[0].response);
    }
    const paymentId = uuidv4();

    await pool.query(
      `INSERT INTO payments (id, amount, currency, status)
       VALUES ($1, $2, $3, $4)`,
      [paymentId, amount, currency, 'pending']
    );

    const response = {
      paymentId,
      status: 'pending'
    };
    await pool.query(
      `INSERT INTO idempotency_keys (key, response, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
      [idempotencyKey, response]
    );
    await paymentQueue.add({
      paymentId,
      amount,
      currency
    });
    return res.status(201).json(response);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
