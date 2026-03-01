const crypto = require('crypto');

function randomAlphanumeric(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(length);
  let result = '';

  for (let index = 0; index < length; index += 1) {
    result += chars[bytes[index] % chars.length];
  }

  return result;
}

exports.generatePaymentId = () => `pay_${randomAlphanumeric(16)}`;
exports.generateRefundId = () => `rfnd_${randomAlphanumeric(16)}`;
