const jwt = require("jsonwebtoken");
const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");

let cachedSecret;

const getJwtSecret = async () => {
  if (cachedSecret) return cachedSecret;

  if (process.env.JWT_SECRET_ARN) {
    const client = new SecretsManagerClient({});
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: process.env.JWT_SECRET_ARN })
    );
    if (!response.SecretString) {
      throw new Error("JWT secret is missing SecretString");
    }
    cachedSecret = response.SecretString;
  } else {
    cachedSecret = process.env.JWT_SECRET;
  }

  if (!cachedSecret) {
    throw new Error("JWT secret not configured (set JWT_SECRET or JWT_SECRET_ARN)");
  }

  return cachedSecret;
};

const signAccessToken = async ({ userId, email }) => {
  const secret = await getJwtSecret();
  return jwt.sign({ userId, email, type: "access" }, secret, { expiresIn: "15m" });
};

const signRefreshToken = async ({ userId, tokenId }) => {
  const secret = await getJwtSecret();
  return jwt.sign({ userId, tokenId, type: "refresh" }, secret, { expiresIn: "7d" });
};

const verifyToken = async (token) => {
  const secret = await getJwtSecret();
  return jwt.verify(token, secret);
};

module.exports = {
  getJwtSecret,
  signAccessToken,
  signRefreshToken,
  verifyToken,
};
