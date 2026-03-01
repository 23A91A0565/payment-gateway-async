const pool = require('../db');

exports.requireMerchantAuth = async (req, res, next) => {
  try {
    const apiKey = req.header('X-Api-Key');
    const apiSecret = req.header('X-Api-Secret');

    if (!apiKey || !apiSecret) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          description: 'Missing API credentials'
        }
      });
    }

    const { rows } = await pool.query(
      `SELECT id, email, api_key, webhook_url, webhook_secret
       FROM merchants
       WHERE api_key = $1 AND api_secret = $2`,
      [apiKey, apiSecret]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          description: 'Invalid API credentials'
        }
      });
    }

    req.merchant = rows[0];
    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        description: 'Authentication failed'
      }
    });
  }
};
