const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const paymentRoutes = require('./routes/payment.routes');
const refundRoutes = require('./routes/refund.routes');
const webhookRoutes = require('./routes/webhook.routes');

app.use('/api/v1', paymentRoutes);
app.use('/api/v1', refundRoutes);
app.use('/api/v1', webhookRoutes);

module.exports = app;
