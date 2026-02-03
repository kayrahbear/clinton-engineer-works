const { getPool } = require("../db/pool");
const { buildResponse } = require("../utils/response");
const {
  isValidUuid,
  isValidDate,
  isBoolean,
  isPositiveInteger,
  parseBody,
} = require("../utils/validation");

const getSimSkills = async (origin, simId) => {
  if (!isValidUuid(simId)) {
    return buildResponse(400, { error: "Invalid sim_id format" }, origin);
  }

  const pool = await getPool();
  const result = await pool.query(
    `SELECT ss.sim_id, ss.skill_id, ss.current_level, ss.is_maxed, ss.maxed_date,
            sk.skill_name, sk.max_level
     FROM sim_skills ss
     JOIN skills sk ON ss.skill_id = sk.skill_id
     WHERE ss.sim_id = $1
     ORDER BY sk.skill_name ASC`,
    [simId]
  );

  return buildResponse(200, { data: result.rows }, origin);
};

const upsertSimSkill = async (origin, simId, body) => {
  if (!isValidUuid(simId)) {
    return buildResponse(400, { error: "Invalid sim_id format" }, origin);
  }

  const parsed = parseBody(body);
  if (!parsed) {
    return buildResponse(400, { error: "Invalid or missing JSON body" }, origin);
  }

  const { skill_id, current_level, is_maxed, maxed_date } = parsed;

  if (!skill_id || !isValidUuid(skill_id)) {
    return buildResponse(
      400,
      { error: "skill_id is required and must be a valid UUID" },
      origin
    );
  }

  if (current_level !== undefined && current_level !== null && !isPositiveInteger(current_level)) {
    return buildResponse(
      400,
      { error: "current_level must be a positive integer" },
      origin
    );
  }

  if (is_maxed !== undefined && is_maxed !== null && !isBoolean(is_maxed)) {
    return buildResponse(400, { error: "is_maxed must be a boolean" }, origin);
  }

  if (maxed_date !== undefined && maxed_date !== null && !isValidDate(maxed_date)) {
    return buildResponse(400, { error: "maxed_date must be a valid date" }, origin);
  }

  const pool = await getPool();

  try {
    const result = await pool.query(
      `INSERT INTO sim_skills (sim_id, skill_id, current_level, is_maxed, maxed_date)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (sim_id, skill_id) DO UPDATE SET
         current_level = COALESCE($3, sim_skills.current_level),
         is_maxed = COALESCE($4, sim_skills.is_maxed),
         maxed_date = COALESCE($5, sim_skills.maxed_date)
       RETURNING *`,
      [
        simId,
        skill_id,
        current_level ?? 1,
        is_maxed ?? false,
        maxed_date || null,
      ]
    );

    return buildResponse(200, { data: result.rows[0] }, origin);
  } catch (error) {
    if (error.code === "23503") {
      return buildResponse(
        400,
        { error: "Referenced sim or skill does not exist" },
        origin
      );
    }
    throw error;
  }
};

const removeSimSkill = async (origin, simId, skillId) => {
  if (!isValidUuid(simId)) {
    return buildResponse(400, { error: "Invalid sim_id format" }, origin);
  }
  if (!isValidUuid(skillId)) {
    return buildResponse(400, { error: "Invalid skill_id format" }, origin);
  }

  const pool = await getPool();
  const result = await pool.query(
    `DELETE FROM sim_skills
     WHERE sim_id = $1 AND skill_id = $2
     RETURNING sim_id, skill_id`,
    [simId, skillId]
  );

  if (result.rows.length === 0) {
    return buildResponse(404, { error: "Sim skill not found" }, origin);
  }

  return buildResponse(200, { data: { deleted: true, ...result.rows[0] } }, origin);
};

module.exports = {
  getSimSkills,
  upsertSimSkill,
  removeSimSkill,
};
