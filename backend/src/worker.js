require('dotenv').config();

require('./workers/payment.worker');
require('./workers/webhook.worker');
require('./workers/refund.worker');

console.log(' Worker started and listening to queues');


;
