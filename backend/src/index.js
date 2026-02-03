const { healthHandler } = require("./handlers/health");
const { getCorsHeaders } = require("./middleware/cors");
const { withErrorHandling } = require("./middleware/error-handler");

const notFound = (origin) => ({
  statusCode: 404,
  headers: {
    "Content-Type": "application/json",
    ...getCorsHeaders(origin),
  },
  body: JSON.stringify({ message: "Not Found" }),
});

const optionsResponse = (origin) => ({
  statusCode: 204,
  headers: {
    ...getCorsHeaders(origin),
  },
  body: "",
});

const handler = async (event) => {
  const origin = event?.headers?.origin || event?.headers?.Origin || "";

  if (event?.httpMethod === "OPTIONS") {
    return optionsResponse(origin);
  }

  const path = event?.path || "";

  if (event?.httpMethod === "GET" && path.endsWith("/health")) {
    return healthHandler(origin);
  }

  return notFound(origin);
};

module.exports = {
  handler: withErrorHandling(handler),
};