const { executeQuery } = require('../config/database');

module.exports = async function(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Authorization parameter signature missing" });
  }

  try {
    // Queries the database to verify if the token exists and is active
    const query = `
      SELECT token, admin_alias, expires_at 
      FROM AdminSessions 
      WHERE token = ? AND datetime(expires_at) > datetime('now', 'utc')
      LIMIT 1
    `;
    const responsePayload = await executeQuery(query, [token]);
    
    // Safely extract the matching rows array from the BaaS layer envelope wrapper
    const sessionsArray = responsePayload?.data || responsePayload?.results || (Array.isArray(responsePayload) ? responsePayload : []);

    // Explicit rejection: if no records match, block access immediately
    if (!sessionsArray || sessionsArray.length === 0) {
      return res.status(403).json({ success: false, message: "Session invalid or access token expired" });
    }

    // Bind the database administrator alias onto the request flow pipeline context
    req.admin = sessionsArray[0].admin_alias || 'root_operator';
    next();
  } catch (error) {
    console.error("💥 Auth Middleware Critical Database Query Exception:", error.message);
    return res.status(500).json({ success: false, message: "Internal authentication subsystem failure." });
  }
};