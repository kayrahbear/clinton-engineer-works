const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidUuid = (value) => UUID_REGEX.test(value);

const isValidDate = (value) => {
  if (typeof value !== "string") {
    return false;
  }
  return !isNaN(Date.parse(value));
};

const isBoolean = (value) => typeof value === "boolean";

const isPositiveInteger = (value) =>
  Number.isInteger(value) && value >= 1;

const parseBody = (rawBody) => {
  if (!rawBody) {
    return null;
  }
  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
};

module.exports = {
  isValidUuid,
  isValidDate,
  isBoolean,
  isPositiveInteger,
  parseBody,
};
