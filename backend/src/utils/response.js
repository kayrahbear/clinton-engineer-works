const { getCorsHeaders } = require("../middleware/cors");

const buildResponse = (statusCode, payload, origin) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    ...getCorsHeaders(origin),
  },
  body: JSON.stringify(payload),
});

module.exports = {
  buildResponse,
};
