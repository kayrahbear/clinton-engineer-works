const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { getPool } = require("../db/pool");
const { buildResponse } = require("../utils/response");
const { parseBody } = require("../utils/validation");
const { signAccessToken, signRefreshToken, verifyToken } = require("../utils/jwt");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = 12;

/**
 * Hash a refresh token for storage (never store raw tokens in DB).
 */
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

/**
 * Generate and store a refresh token pair, returning the raw JWT.
 */
const createRefreshToken = async (pool, userId) => {
  // Create a token_id for this refresh token
  const tokenIdResult = await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, 'pending', NOW() + INTERVAL '7 days')
     RETURNING token_id, expires_at`,
    [userId]
  );
  const { token_id, expires_at } = tokenIdResult.rows[0];

  // Sign the JWT with the token_id embedded
  const rawToken = await signRefreshToken({ userId, tokenId: token_id });

  // Store the hash of the raw JWT
  await pool.query(
    `UPDATE refresh_tokens SET token_hash = $1 WHERE token_id = $2`,
    [hashToken(rawToken), token_id]
  );

  return rawToken;
};

/**
 * POST /auth/register
 */
const register = async (origin, body) => {
  const parsed = parseBody(body);
  if (!parsed) {
    return buildResponse(400, { error: "Invalid or missing JSON body" }, origin);
  }

  const { email, password, display_name } = parsed;

  // Validate email
  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    return buildResponse(400, { error: "A valid email is required" }, origin);
  }

  // Validate password
  if (!password || typeof password !== "string") {
    return buildResponse(400, { error: "Password is required" }, origin);
  }
  if (password.length < 8) {
    return buildResponse(400, { error: "Password must be at least 8 characters" }, origin);
  }
  if (password.length > 128) {
    return buildResponse(400, { error: "Password must be 128 characters or fewer" }, origin);
  }

  // Validate display_name
  if (!display_name || typeof display_name !== "string" || display_name.trim().length === 0) {
    return buildResponse(400, { error: "Display name is required" }, origin);
  }
  if (display_name.trim().length > 100) {
    return buildResponse(400, { error: "Display name must be 100 characters or fewer" }, origin);
  }

  const pool = await getPool();

  // Check for existing user (case-insensitive)
  const existing = await pool.query(
    `SELECT user_id FROM users WHERE LOWER(email) = LOWER($1)`,
    [email.trim()]
  );
  if (existing.rows.length > 0) {
    return buildResponse(409, { error: "An account with this email already exists" }, origin);
  }

  // Hash password and create user
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const userResult = await pool.query(
    `INSERT INTO users (email, password_hash, display_name)
     VALUES ($1, $2, $3)
     RETURNING user_id, email, display_name, created_at`,
    [email.trim().toLowerCase(), passwordHash, display_name.trim()]
  );
  const user = userResult.rows[0];

  // Generate tokens
  const accessToken = await signAccessToken({ userId: user.user_id, email: user.email });
  const refreshToken = await createRefreshToken(pool, user.user_id);

  return buildResponse(
    201,
    {
      user: {
        user_id: user.user_id,
        email: user.email,
        display_name: user.display_name,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
    },
    origin
  );
};

/**
 * POST /auth/login
 */
const login = async (origin, body) => {
  const parsed = parseBody(body);
  if (!parsed) {
    return buildResponse(400, { error: "Invalid or missing JSON body" }, origin);
  }

  const { email, password } = parsed;

  if (!email || !password) {
    return buildResponse(400, { error: "Email and password are required" }, origin);
  }

  const pool = await getPool();

  // Look up user by email (case-insensitive)
  const userResult = await pool.query(
    `SELECT user_id, email, password_hash, display_name
     FROM users WHERE LOWER(email) = LOWER($1)`,
    [email.trim()]
  );

  if (userResult.rows.length === 0) {
    return buildResponse(401, { error: "Invalid email or password" }, origin);
  }

  const user = userResult.rows[0];

  // Verify password
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return buildResponse(401, { error: "Invalid email or password" }, origin);
  }

  // Generate tokens
  const accessToken = await signAccessToken({ userId: user.user_id, email: user.email });
  const refreshToken = await createRefreshToken(pool, user.user_id);

  return buildResponse(
    200,
    {
      user: {
        user_id: user.user_id,
        email: user.email,
        display_name: user.display_name,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
    },
    origin
  );
};

/**
 * GET /auth/me
 */
const getMe = async (origin, userId) => {
  const pool = await getPool();

  const result = await pool.query(
    `SELECT user_id, email, display_name, created_at
     FROM users WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return buildResponse(404, { error: "User not found" }, origin);
  }

  return buildResponse(200, { user: result.rows[0] }, origin);
};

/**
 * POST /auth/refresh
 */
const refreshTokens = async (origin, body) => {
  const parsed = parseBody(body);
  if (!parsed) {
    return buildResponse(400, { error: "Invalid or missing JSON body" }, origin);
  }

  const { refresh_token } = parsed;
  if (!refresh_token) {
    return buildResponse(400, { error: "refresh_token is required" }, origin);
  }

  // Verify the JWT signature and type
  let decoded;
  try {
    decoded = await verifyToken(refresh_token);
  } catch (error) {
    return buildResponse(401, { error: "Invalid or expired refresh token" }, origin);
  }

  if (decoded.type !== "refresh") {
    return buildResponse(401, { error: "Invalid token type" }, origin);
  }

  const pool = await getPool();

  // Look up the refresh token record
  const tokenResult = await pool.query(
    `SELECT token_id, user_id, expires_at, revoked_at
     FROM refresh_tokens
     WHERE token_id = $1`,
    [decoded.tokenId]
  );

  if (tokenResult.rows.length === 0) {
    return buildResponse(401, { error: "Refresh token not found" }, origin);
  }

  const tokenRecord = tokenResult.rows[0];

  // Check if revoked or expired
  if (tokenRecord.revoked_at) {
    return buildResponse(401, { error: "Refresh token has been revoked" }, origin);
  }
  if (new Date(tokenRecord.expires_at) < new Date()) {
    return buildResponse(401, { error: "Refresh token has expired" }, origin);
  }

  // Verify hash matches
  const expectedHash = hashToken(refresh_token);
  const storedResult = await pool.query(
    `SELECT token_id FROM refresh_tokens
     WHERE token_id = $1 AND token_hash = $2`,
    [decoded.tokenId, expectedHash]
  );
  if (storedResult.rows.length === 0) {
    return buildResponse(401, { error: "Invalid refresh token" }, origin);
  }

  // Revoke the old refresh token (token rotation)
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_id = $1`,
    [decoded.tokenId]
  );

  // Get user info for the new access token
  const userResult = await pool.query(
    `SELECT user_id, email FROM users WHERE user_id = $1`,
    [tokenRecord.user_id]
  );

  if (userResult.rows.length === 0) {
    return buildResponse(401, { error: "User not found" }, origin);
  }

  const user = userResult.rows[0];

  // Generate new token pair
  const newAccessToken = await signAccessToken({ userId: user.user_id, email: user.email });
  const newRefreshToken = await createRefreshToken(pool, user.user_id);

  return buildResponse(
    200,
    {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    },
    origin
  );
};

/**
 * POST /auth/logout
 */
const logout = async (origin, userId, body) => {
  const parsed = parseBody(body);
  const pool = await getPool();

  if (parsed && parsed.refresh_token) {
    // Revoke the specific refresh token
    let decoded;
    try {
      decoded = await verifyToken(parsed.refresh_token);
    } catch {
      // Token is invalid/expired -- still consider logout successful
      return buildResponse(200, { message: "Logged out" }, origin);
    }

    if (decoded.tokenId) {
      await pool.query(
        `UPDATE refresh_tokens SET revoked_at = NOW()
         WHERE token_id = $1 AND user_id = $2 AND revoked_at IS NULL`,
        [decoded.tokenId, userId]
      );
    }
  } else {
    // Revoke all refresh tokens for this user
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
  }

  return buildResponse(200, { message: "Logged out" }, origin);
};

module.exports = {
  register,
  login,
  getMe,
  refreshTokens,
  logout,
};
