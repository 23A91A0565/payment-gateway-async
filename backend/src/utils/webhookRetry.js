const RETRY_DELAYS = [0, 60, 300, 1800, 7200]; // seconds

exports.getNextRetryDelay = (attempts) => {
  return RETRY_DELAYS[attempts] ?? null;
};
