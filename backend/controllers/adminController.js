const { executeQuery } = require('../config/database');

const SESSION_DURATION_HOURS = 24;

exports.loginHandshake = async (req, res) => {
  const { tokenKey } = req.body;

  if (!tokenKey) {
    return res.status(400).json({
      success: false,
      message: 'Token parameter required.'
    });
  }

  try {
    const query = `
      SELECT
        token,
        admin_alias,
        expires_at
      FROM AdminSessions
      WHERE token = ?
      LIMIT 1
    `;

    const responsePayload = await executeQuery(query, [tokenKey]);

    const records =
      responsePayload?.data ||
      responsePayload?.results ||
      (Array.isArray(responsePayload)
        ? responsePayload
        : []);

    if (!records.length) {
      return res.status(401).json({
        success: false,
        message: 'Invalid security token.'
      });
    }

    const session = records[0];

    const dbExpiryTime =
      new Date(session.expires_at).getTime();

    const currentTime = Date.now();

    if (dbExpiryTime <= currentTime) {
      return res.status(401).json({
        success: false,
        message: 'Session expired.'
      });
    }

    const frontendExpiry =
      currentTime +
      SESSION_DURATION_HOURS *
        60 *
        60 *
        1000;

    return res.json({
      success: true,
      token: session.token,
      admin: session.admin_alias,
      expiresAt: frontendExpiry,
      message: 'Handshake verified successfully.'
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: 'Internal server authentication failure.'
    });
  }
};

exports.verifySession = async (req, res) => {
  try {
    return res.json({
      success: true,
      admin: req.admin
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Session verification failed.'
    });
  }
};