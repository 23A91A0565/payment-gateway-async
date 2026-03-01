const paymentQueue = require('../queues/payment.queue');
const refundQueue = require('../queues/refund.queue');
const webhookQueue = require('../queues/webhook.queue');

const getStatusForQueue = async (queue) => {
  const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed');
  return {
    pending: counts.waiting || 0,
    processing: counts.active || 0,
    completed: counts.completed || 0,
    failed: counts.failed || 0
  };
};

exports.getJobsStatus = async (req, res) => {
  try {
    const [payment, refund, webhook] = await Promise.all([
      getStatusForQueue(paymentQueue),
      getStatusForQueue(refundQueue),
      getStatusForQueue(webhookQueue)
    ]);

    let workerStatus = 'running';
    try {
      await Promise.all([
        paymentQueue.isReady(),
        refundQueue.isReady(),
        webhookQueue.isReady()
      ]);
    } catch (error) {
      workerStatus = 'stopped';
    }

    return res.status(200).json({
      pending: payment.pending + refund.pending + webhook.pending,
      processing: payment.processing + refund.processing + webhook.processing,
      completed: payment.completed + refund.completed + webhook.completed,
      failed: payment.failed + refund.failed + webhook.failed,
      worker_status: workerStatus
    });
  } catch (error) {
    console.error('Get jobs status error:', error);
    return res.status(200).json({
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      worker_status: 'stopped'
    });
  }
};
