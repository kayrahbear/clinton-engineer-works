const { getPool } = require("../db/pool");
const { buildResponse } = require("../utils/response");
const {
  isValidUuid,
  isValidDate,
  isBoolean,
  parseBody,
} = require("../utils/validation");
const { verifySimOwnership } = require("../utils/authorization");

const getSimAspirations = async (origin, userId, simId) => {
  if (!isValidUuid(simId)) {
    return buildResponse(400, { error: "Invalid sim_id format" }, origin);
  }

  if (!(await verifySimOwnership(simId, userId))) {
    return buildResponse(404, { error: "Sim not found" }, origin);
  }

  const pool = await getPool();
  const result = await pool.query(
    `SELECT sa.sim_id, sa.aspiration_id, sa.is_completed, sa.completion_date,
            sa.is_current,
            a.aspiration_name, a.category, a.pack_required
     FROM sim_aspirations sa
     JOIN aspirations a ON sa.aspiration_id = a.aspiration_id
     WHERE sa.sim_id = $1
     ORDER BY sa.is_current DESC, a.aspiration_name ASC`,
    [simId]
  );

  return buildResponse(200, { data: result.rows }, origin);
};

const addSimAspiration = async (origin, userId, simId, body) => {
  if (!isValidUuid(simId)) {
    return buildResponse(400, { error: "Invalid sim_id format" }, origin);
  }

  if (!(await verifySimOwnership(simId, userId))) {
    return buildResponse(404, { error: "Sim not found" }, origin);
  }

  const parsed = parseBody(body);
  if (!parsed) {
    return buildResponse(400, { error: "Invalid or missing JSON body" }, origin);
  }

  const { aspiration_id, is_current, is_completed, completion_date } = parsed;

  if (!aspiration_id || !isValidUuid(aspiration_id)) {
    return buildResponse(
      400,
      { error: "aspiration_id is required and must be a valid UUID" },
      origin
    );
  }

  if (is_current !== undefined && is_current !== null && !isBoolean(is_current)) {
    return buildResponse(400, { error: "is_current must be a boolean" }, origin);
  }

  if (is_completed !== undefined && is_completed !== null && !isBoolean(is_completed)) {
    return buildResponse(400, { error: "is_completed must be a boolean" }, origin);
  }

  if (completion_date !== undefined && completion_date !== null && !isValidDate(completion_date)) {
    return buildResponse(400, { error: "completion_date must be a valid date" }, origin);
  }

  const pool = await getPool();
  const setCurrent = is_current === true;

  if (setCurrent) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE sim_aspirations SET is_current = FALSE
         WHERE sim_id = $1 AND is_current = TRUE`,
        [simId]
      );
      const result = await client.query(
        `INSERT INTO sim_aspirations (sim_id, aspiration_id, is_current, is_completed, completion_date)
         VALUES ($1, $2, TRUE, $3, $4)
         RETURNING *`,
        [
          simId,
          aspiration_id,
          is_completed ?? false,
          completion_date || null,
        ]
      );
      await client.query("COMMIT");
      return buildResponse(201, { data: result.rows[0] }, origin);
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch (_) { /* connection lost */ }
      if (error.code === "23503") {
        return buildResponse(
          400,
          { error: "Referenced sim or aspiration does not exist" },
          origin
        );
      }
      if (error.code === "23505") {
        return buildResponse(
          409,
          { error: "This aspiration is already assigned to this sim" },
          origin
        );
      }
      throw error;
    } finally {
      client.release();
    }
  }

  try {
    const result = await pool.query(
      `INSERT INTO sim_aspirations (sim_id, aspiration_id, is_current, is_completed, completion_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        simId,
        aspiration_id,
        false,
        is_completed ?? false,
        completion_date || null,
      ]
    );

    return buildResponse(201, { data: result.rows[0] }, origin);
  } catch (error) {
    if (error.code === "23503") {
      return buildResponse(
        400,
        { error: "Referenced sim or aspiration does not exist" },
        origin
      );
    }
    if (error.code === "23505") {
      return buildResponse(
        409,
        { error: "This aspiration is already assigned to this sim" },
        origin
      );
    }
    throw error;
  }
};

const updateSimAspiration = async (origin, userId, simId, aspirationId, body) => {
  if (!isValidUuid(simId)) {
    return buildResponse(400, { error: "Invalid sim_id format" }, origin);
  }
  if (!isValidUuid(aspirationId)) {
    return buildResponse(400, { error: "Invalid aspiration_id format" }, origin);
  }

  if (!(await verifySimOwnership(simId, userId))) {
    return buildResponse(404, { error: "Sim not found" }, origin);
  }

  const parsed = parseBody(body);
  if (!parsed) {
    return buildResponse(400, { error: "Invalid or missing JSON body" }, origin);
  }

  const { is_current, is_completed, completion_date } = parsed;

  if (is_current !== undefined && is_current !== null && !isBoolean(is_current)) {
    return buildResponse(400, { error: "is_current must be a boolean" }, origin);
  }

  if (is_completed !== undefined && is_completed !== null && !isBoolean(is_completed)) {
    return buildResponse(400, { error: "is_completed must be a boolean" }, origin);
  }

  if (completion_date !== undefined && completion_date !== null && !isValidDate(completion_date)) {
    return buildResponse(400, { error: "completion_date must be a valid date" }, origin);
  }

  const setClauses = [];
  const params = [simId, aspirationId];
  let paramIndex = 3;

  if (is_current !== undefined) {
    setClauses.push(`is_current = $${paramIndex}`);
    params.push(is_current);
    paramIndex += 1;
  }
  if (is_completed !== undefined) {
    setClauses.push(`is_completed = $${paramIndex}`);
    params.push(is_completed);
    paramIndex += 1;
  }
  if (completion_date !== undefined) {
    setClauses.push(`completion_date = $${paramIndex}`);
    params.push(completion_date);
    paramIndex += 1;
  }

  if (setClauses.length === 0) {
    return buildResponse(400, { error: "No valid fields to update" }, origin);
  }

  const pool = await getPool();

  if (is_current === true) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE sim_aspirations SET is_current = FALSE
         WHERE sim_id = $1 AND is_current = TRUE`,
        [simId]
      );
      const result = await client.query(
        `UPDATE sim_aspirations
         SET ${setClauses.join(", ")}
         WHERE sim_id = $1 AND aspiration_id = $2
         RETURNING *`,
        params
      );
      await client.query("COMMIT");

      if (result.rows.length === 0) {
        return buildResponse(404, { error: "Sim aspiration not found" }, origin);
      }
      return buildResponse(200, { data: result.rows[0] }, origin);
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch (_) { /* connection lost */ }
      throw error;
    } finally {
      client.release();
    }
  }

  const result = await pool.query(
    `UPDATE sim_aspirations
     SET ${setClauses.join(", ")}
     WHERE sim_id = $1 AND aspiration_id = $2
     RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    return buildResponse(404, { error: "Sim aspiration not found" }, origin);
  }

  return buildResponse(200, { data: result.rows[0] }, origin);
};

const removeSimAspiration = async (origin, userId, simId, aspirationId) => {
  if (!isValidUuid(simId)) {
    return buildResponse(400, { error: "Invalid sim_id format" }, origin);
  }
  if (!isValidUuid(aspirationId)) {
    return buildResponse(400, { error: "Invalid aspiration_id format" }, origin);
  }

  if (!(await verifySimOwnership(simId, userId))) {
    return buildResponse(404, { error: "Sim not found" }, origin);
  }

  const pool = await getPool();
  const result = await pool.query(
    `DELETE FROM sim_aspirations
     WHERE sim_id = $1 AND aspiration_id = $2
     RETURNING sim_id, aspiration_id`,
    [simId, aspirationId]
  );

  if (result.rows.length === 0) {
    return buildResponse(404, { error: "Sim aspiration not found" }, origin);
  }

  return buildResponse(200, { data: { deleted: true, ...result.rows[0] } }, origin);
};

module.exports = {
  getSimAspirations,
  addSimAspiration,
  updateSimAspiration,
  removeSimAspiration,
};
