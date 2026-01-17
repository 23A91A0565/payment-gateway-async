const createQueue = require('./redis');
module.exports = createQueue('payment-queue');
