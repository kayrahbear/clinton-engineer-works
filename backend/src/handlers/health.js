const { getPool } = require("../db/pool");

const buildResponse = (statusCode, payload) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": process.env.CORS_ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  },
  body: JSON.stringify(payload),
});

const healthHandler = async () => {
  try {
    const pool = await getPool();
    const result = await pool.query("SELECT NOW() as now");
    return buildResponse(200, {
      status: "ok",
      dbTime: result.rows[0]?.now ?? null,
    });
  } catch (error) {
    console.error("Health check failed", error);
    return buildResponse(500, {
      status: "error",
      message: "Database connection failed",
    });
  }
};

module.exports = {
  healthHandler,
};