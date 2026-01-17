const createQueue = require('./redis');
module.exports = createQueue('refund-queue');
