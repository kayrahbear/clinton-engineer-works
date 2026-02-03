const buildResponse = (statusCode, payload) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": process.env.CORS_ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  },
  body: JSON.stringify(payload),
});

const withErrorHandling = (handler) => async (event) => {
  try {
    return await handler(event);
  } catch (error) {
    console.error("Unhandled error", error);
    return buildResponse(500, {
      status: "error",
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  withErrorHandling,
};