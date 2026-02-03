const { healthHandler } = require("./handlers/health");
const { withErrorHandling } = require("./middleware/error-handler");

const notFound = () => ({
  statusCode: 404,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": process.env.CORS_ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  },
  body: JSON.stringify({ message: "Not Found" }),
});

const optionsResponse = () => ({
  statusCode: 204,
  headers: {
    "Access-Control-Allow-Origin": process.env.CORS_ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  },
  body: "",
});

const handler = async (event) => {
  if (event?.httpMethod === "OPTIONS") {
    return optionsResponse();
  }

  const path = event?.path || "";

  if (event?.httpMethod === "GET" && path.endsWith("/health")) {
    return healthHandler();
  }

  return notFound();
};

module.exports = {
  handler: withErrorHandling(handler),
};