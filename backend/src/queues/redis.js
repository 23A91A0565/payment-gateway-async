const Queue = require('bull');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

module.exports = (name) =>
  new Queue(name, REDIS_URL);
