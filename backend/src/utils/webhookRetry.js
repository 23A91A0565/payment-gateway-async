const PROD_RETRY_DELAYS = [0, 60, 300, 1800, 7200];
const TEST_RETRY_DELAYS = [0, 5, 10, 15, 20];

const getDelays = () => {
  if (String(process.env.WEBHOOK_RETRY_INTERVALS_TEST).toLowerCase() === 'true') {
    return TEST_RETRY_DELAYS;
  }

  return PROD_RETRY_DELAYS;
};

exports.getNextRetryDelay = (attempts) => {
  const delays = getDelays();
  return delays[attempts] ?? null;
};
