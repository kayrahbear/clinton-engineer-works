const { getPool } = require("../db/pool");
const { buildResponse } = require("../utils/response");
const {
  isValidUuid,
  isValidDate,
  isBoolean,
  isPositiveInteger,
  parseBody,
} = require("../utils/validation");
const { verifySimOwnership } = require("../utils/authorization");

const getSimCareers = async (origin, userId, simId) => {
  if (!isValidUuid(simId)) {
    return buildResponse(400, { error: "Invalid sim_id format" }, origin);
  }

  if (!(await verifySimOwnership(simId, userId))) {
    return buildResponse(404, { error: "Sim not found" }, origin);
  }

  const pool = await getPool();
  const result = await pool.query(
    `SELECT sc.sim_career_id, sc.sim_id, sc.career_id, sc.branch_id,
            sc.current_level, sc.is_completed, sc.completion_date, sc.is_current,
            c.career_name, c.max_level, c.career_type,
            cb.branch_name
     FROM sim_careers sc
     JOIN careers c ON sc.career_id = c.career_id
     LEFT JOIN career_branches cb ON sc.branch_id = cb.branch_id
     WHERE sc.sim_id = $1
     ORDER BY sc.is_current DESC, c.career_name ASC`,
    [simId]
  );

  return buildResponse(200, { data: result.rows }, origin);
};

const addSimCareer = async (origin, userId, simId, body) => {
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

  const { career_id, branch_id, current_level, is_current, is_completed, completion_date } = parsed;

  if (!career_id || !isValidUuid(career_id)) {
    return buildResponse(
      400,
      { error: "career_id is required and must be a valid UUID" },
      origin
    );
  }

  if (branch_id !== undefined && branch_id !== null && !isValidUuid(branch_id)) {
    return buildResponse(400, { error: "branch_id must be a valid UUID" }, origin);
  }

  if (current_level !== undefined && current_level !== null && !isPositiveInteger(current_level)) {
    return buildResponse(
      400,
      { error: "current_level must be a positive integer" },
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
        `UPDATE sim_careers SET is_current = FALSE
         WHERE sim_id = $1 AND is_current = TRUE`,
        [simId]
      );
      const result = await client.query(
        `INSERT INTO sim_careers (sim_id, career_id, branch_id, current_level, is_current, is_completed, completion_date)
         VALUES ($1, $2, $3, $4, TRUE, $5, $6)
         RETURNING *`,
        [
          simId,
          career_id,
          branch_id || null,
          current_level ?? 1,
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
          { error: "Referenced sim, career, or branch does not exist" },
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
      `INSERT INTO sim_careers (sim_id, career_id, branch_id, current_level, is_current, is_completed, completion_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        simId,
        career_id,
        branch_id || null,
        current_level ?? 1,
        setCurrent,
        is_completed ?? false,
        completion_date || null,
      ]
    );

    return buildResponse(201, { data: result.rows[0] }, origin);
  } catch (error) {
    if (error.code === "23503") {
      return buildResponse(
        400,
        { error: "Referenced sim, career, or branch does not exist" },
        origin
      );
    }
    throw error;
  }
};

const updateSimCareer = async (origin, userId, simId, simCareerId, body) => {
  if (!isValidUuid(simId)) {
    return buildResponse(400, { error: "Invalid sim_id format" }, origin);
  }
  if (!isValidUuid(simCareerId)) {
    return buildResponse(400, { error: "Invalid sim_career_id format" }, origin);
  }

  if (!(await verifySimOwnership(simId, userId))) {
    return buildResponse(404, { error: "Sim not found" }, origin);
  }

  const parsed = parseBody(body);
  if (!parsed) {
    return buildResponse(400, { error: "Invalid or missing JSON body" }, origin);
  }

  const { branch_id, current_level, is_current, is_completed, completion_date } = parsed;

  if (branch_id !== undefined && branch_id !== null && !isValidUuid(branch_id)) {
    return buildResponse(400, { error: "branch_id must be a valid UUID" }, origin);
  }

  if (current_level !== undefined && current_level !== null && !isPositiveInteger(current_level)) {
    return buildResponse(
      400,
      { error: "current_level must be a positive integer" },
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

  const setClauses = [];
  const params = [simCareerId, simId];
  let paramIndex = 3;

  if (branch_id !== undefined) {
    setClauses.push(`branch_id = $${paramIndex}`);
    params.push(branch_id);
    paramIndex += 1;
  }
  if (current_level !== undefined) {
    setClauses.push(`current_level = $${paramIndex}`);
    params.push(current_level);
    paramIndex += 1;
  }
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
        `UPDATE sim_careers SET is_current = FALSE
         WHERE sim_id = $1 AND is_current = TRUE`,
        [simId]
      );
      const result = await client.query(
        `UPDATE sim_careers
         SET ${setClauses.join(", ")}
         WHERE sim_career_id = $1 AND sim_id = $2
         RETURNING *`,
        params
      );
      await client.query("COMMIT");

      if (result.rows.length === 0) {
        return buildResponse(404, { error: "Sim career not found" }, origin);
      }
      return buildResponse(200, { data: result.rows[0] }, origin);
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch (_) { /* connection lost */ }
      if (error.code === "23503") {
        return buildResponse(
          400,
          { error: "Referenced career or branch does not exist" },
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
      `UPDATE sim_careers
       SET ${setClauses.join(", ")}
       WHERE sim_career_id = $1 AND sim_id = $2
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return buildResponse(404, { error: "Sim career not found" }, origin);
    }

    return buildResponse(200, { data: result.rows[0] }, origin);
  } catch (error) {
    if (error.code === "23503") {
      return buildResponse(
        400,
        { error: "Referenced career or branch does not exist" },
        origin
      );
    }
    throw error;
  }
};

const removeSimCareer = async (origin, userId, simId, simCareerId) => {
  if (!isValidUuid(simId)) {
    return buildResponse(400, { error: "Invalid sim_id format" }, origin);
  }
  if (!isValidUuid(simCareerId)) {
    return buildResponse(400, { error: "Invalid sim_career_id format" }, origin);
  }

  if (!(await verifySimOwnership(simId, userId))) {
    return buildResponse(404, { error: "Sim not found" }, origin);
  }

  const pool = await getPool();
  const result = await pool.query(
    `DELETE FROM sim_careers
     WHERE sim_career_id = $1 AND sim_id = $2
     RETURNING sim_career_id, sim_id`,
    [simCareerId, simId]
  );

  if (result.rows.length === 0) {
    return buildResponse(404, { error: "Sim career not found" }, origin);
  }

  return buildResponse(200, { data: { deleted: true, ...result.rows[0] } }, origin);
};

module.exports = {
  getSimCareers,
  addSimCareer,
  updateSimCareer,
  removeSimCareer,
};
