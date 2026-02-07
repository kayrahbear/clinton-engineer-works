const { verifyToken } = require("../utils/jwt");
const { buildResponse } = require("../utils/response");

// Routes that do NOT require authentication
const PUBLIC_ROUTE_PATTERNS = [
  { method: "GET", pattern: /\/health\/?$/i },
  { method: "GET", pattern: /\/reference\//i },
  { method: "GET", pattern: /\/generation-templates/i },
  { method: "POST", pattern: /\/auth\/register\/?$/i },
  { method: "POST", pattern: /\/auth\/login\/?$/i },
  { method: "POST", pattern: /\/auth\/refresh\/?$/i },
];

const isPublicRoute = (method, path) => {
  return PUBLIC_ROUTE_PATTERNS.some(
    (route) => route.method === method && route.pattern.test(path)
  );
};

const withAuth = (handler) => async (event) => {
  const method = event?.httpMethod || "";
  const rawPath = event?.path || "";
  const path = rawPath.split("?")[0];

  // Skip auth for OPTIONS (CORS preflight) and public routes
  if (method === "OPTIONS" || isPublicRoute(method, path)) {
    return handler(event);
  }

  const origin = event?.headers?.origin || event?.headers?.Origin || "";
  const authHeader =
    event?.headers?.authorization || event?.headers?.Authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return buildResponse(401, { error: "Authentication required" }, origin);
  }

  const token = authHeader.slice(7);

  try {
    const decoded = await verifyToken(token);

    if (decoded.type !== "access") {
      return buildResponse(401, { error: "Invalid token type" }, origin);
    }

    // Attach user info to event for downstream handlers
    event.userId = decoded.userId;
    event.userEmail = decoded.email;

    return handler(event);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return buildResponse(401, { error: "Token expired" }, origin);
    }
    return buildResponse(401, { error: "Invalid token" }, origin);
  }
};

module.exports = { withAuth, isPublicRoute };
