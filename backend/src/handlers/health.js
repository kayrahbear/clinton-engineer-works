const { getPool } = require("../db/pool");
const { getCorsHeaders } = require("../middleware/cors");

const buildResponse = (statusCode, payload, origin) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    ...getCorsHeaders(origin),
  },
  body: JSON.stringify(payload),
});

const healthHandler = async (origin) => {
  try {
    const pool = await getPool();
    const result = await pool.query("SELECT NOW() as now");
    return buildResponse(200, {
      status: "ok",
      dbTime: result.rows[0]?.now ?? null,
    }, origin);
  } catch (error) {
    console.error("Health check failed", error);
    return buildResponse(500, {
      status: "error",
      message: "Database connection failed",
    }, origin);
  }
};

module.exports = {
  healthHandler,
};