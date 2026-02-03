const { getCorsHeaders } = require("./cors");

const buildResponse = (statusCode, payload, origin) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    ...getCorsHeaders(origin),
  },
  body: JSON.stringify(payload),
});

const withErrorHandling = (handler) => async (event) => {
  try {
    return await handler(event);
  } catch (error) {
    console.error("Unhandled error", error);
    const origin = event?.headers?.origin || event?.headers?.Origin || "";
    return buildResponse(500, {
      status: "error",
      message: "Internal Server Error",
    }, origin);
  }
};

module.exports = {
  withErrorHandling,
};