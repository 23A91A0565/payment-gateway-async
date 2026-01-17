const createQueue = require('./redis');
module.exports = createQueue('webhook-queue');
