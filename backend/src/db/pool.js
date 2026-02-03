const { Pool } = require("pg");
const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");
require("dotenv").config();

let poolPromise;

const loadDbConfig = async () => {
  const useSsl = process.env.DB_SSL === "true" || Boolean(process.env.DB_SECRET_ARN);

  if (!process.env.DB_SECRET_ARN) {
    return {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    };
  }

  const client = new SecretsManagerClient({});
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN })
  );

  if (!response.SecretString) {
    throw new Error("DB secret is missing SecretString");
  }

  const secret = JSON.parse(response.SecretString);
  return {
    host: secret.host,
    port: Number(secret.port || 5432),
    database: secret.dbname,
    user: secret.username,
    password: secret.password,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  };
};

const getPool = async () => {
  if (!poolPromise) {
    poolPromise = loadDbConfig().then((config) => new Pool(config));
  }
  return poolPromise;
};

module.exports = {
  getPool,
};