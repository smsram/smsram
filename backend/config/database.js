require('dotenv').config();

/**
 * Universal Database Transaction Operator
 * Dispatches arbitrary raw SQL queries directly over your secured Hugging Face BaaS runtime channel
 * @param {string} sqlString - Standard SQL execution string parameters
 * @param {Array} bindParameters - Optional values array to replace query question marks (?) safely
 */
async function executeQuery(sqlString, bindParameters = []) {
  const secretKey = process.env.BAAS_TOKEN;
  const targetChannel = process.env.BAAS_QUERY_CHANNEL;

  try {
    const response = await fetch(targetChannel, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql: sqlString,
        params: bindParameters
      })
    });

    const payload = await response.json();

    if (!response.ok || payload.error) {
      throw new Error(payload.message || payload.error || "BaaS query channel execution error");
    }

    // Returns structural data arrays directly back to your controller handlers
    return payload.results || payload;
  } catch (err) {
    console.error("Database Transaction Exception:", err.message);
    throw err;
  }
}

module.exports = { executeQuery };