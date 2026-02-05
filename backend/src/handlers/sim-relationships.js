const { getPool } = require("../db/pool");
const { buildResponse } = require("../utils/response");
const { isValidUuid, isValidDate, isBoolean, parseBody } = require("../utils/validation");

const VALID_RELATIONSHIP_TYPES = [
  "spouse",
  "romantic_interest",
  "friend",
  "enemy",
  "parent",
  "child",
  "sibling",
];

const getSimRelationships = async (origin, simId) => {
  if (!isValidUuid(simId)) {
    return buildResponse(400, { error: "Invalid sim_id format" }, origin);
  }

  const pool = await getPool();
  const result = await pool.query(
    `SELECT r.*,
       CASE WHEN r.sim_id_1 = $1 THEN s2.name ELSE s1.name END AS related_sim_name,
       CASE WHEN r.sim_id_1 = $1 THEN s2.sim_id ELSE s1.sim_id END AS related_sim_id,
       CASE WHEN r.sim_id_1 = $1 THEN s2.portrait ELSE s1.portrait END AS related_sim_portrait
     FROM relationships r
     JOIN sims s1 ON r.sim_id_1 = s1.sim_id
     JOIN sims s2 ON r.sim_id_2 = s2.sim_id
     WHERE (r.sim_id_1 = $1 OR r.sim_id_2 = $1)
     ORDER BY r.relationship_type, r.is_active DESC`,
    [simId]
  );

  return buildResponse(200, { data: result.rows }, origin);
};

const addSimRelationship = async (origin, simId, body) => {
  if (!isValidUuid(simId)) {
    return buildResponse(400, { error: "Invalid sim_id format" }, origin);
  }

  const parsed = parseBody(body);
  if (!parsed) {
    return buildResponse(400, { error: "Invalid or missing JSON body" }, origin);
  }

  const { sim_id_2, relationship_type, is_active, started_date, ended_date } = parsed;

  if (!sim_id_2 || !isValidUuid(sim_id_2)) {
    return buildResponse(
      400,
      { error: "sim_id_2 is required and must be a valid UUID" },
      origin
    );
  }

  if (!relationship_type || !VALID_RELATIONSHIP_TYPES.includes(relationship_type)) {
    return buildResponse(
      400,
      {
        error: `relationship_type is required and must be one of: ${VALID_RELATIONSHIP_TYPES.join(", ")}`,
      },
      origin
    );
  }

  if (is_active !== undefined && is_active !== null && !isBoolean(is_active)) {
    return buildResponse(400, { error: "is_active must be a boolean" }, origin);
  }

  if (started_date !== undefined && started_date !== null && !isValidDate(started_date)) {
    return buildResponse(400, { error: "started_date must be a valid date" }, origin);
  }

  if (ended_date !== undefined && ended_date !== null && !isValidDate(ended_date)) {
    return buildResponse(400, { error: "ended_date must be a valid date" }, origin);
  }

  const pool = await getPool();

  try {
    const result = await pool.query(
      `INSERT INTO relationships (sim_id_1, sim_id_2, relationship_type, is_active, started_date, ended_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        simId,
        sim_id_2,
        relationship_type,
        is_active ?? true,
        started_date || null,
        ended_date || null,
      ]
    );

    return buildResponse(201, { data: result.rows[0] }, origin);
  } catch (error) {
    if (error.code === "23503") {
      return buildResponse(
        400,
        { error: "Referenced sim does not exist" },
        origin
      );
    }
    if (error.code === "23505") {
      return buildResponse(
        409,
        { error: "This relationship already exists between these sims" },
        origin
      );
    }
    if (error.code === "23514") {
      return buildResponse(
        400,
        { error: "A sim cannot have a relationship with itself" },
        origin
      );
    }
    throw error;
  }
};

const updateSimRelationship = async (origin, simId, relationshipId, body) => {
  if (!isValidUuid(simId)) {
    return buildResponse(400, { error: "Invalid sim_id format" }, origin);
  }
  if (!isValidUuid(relationshipId)) {
    return buildResponse(400, { error: "Invalid relationship_id format" }, origin);
  }

  const parsed = parseBody(body);
  if (!parsed) {
    return buildResponse(400, { error: "Invalid or missing JSON body" }, origin);
  }

  const { is_active, started_date, ended_date } = parsed;

  if (is_active !== undefined && is_active !== null && !isBoolean(is_active)) {
    return buildResponse(400, { error: "is_active must be a boolean" }, origin);
  }

  if (started_date !== undefined && started_date !== null && !isValidDate(started_date)) {
    return buildResponse(400, { error: "started_date must be a valid date" }, origin);
  }

  if (ended_date !== undefined && ended_date !== null && !isValidDate(ended_date)) {
    return buildResponse(400, { error: "ended_date must be a valid date" }, origin);
  }

  const setClauses = [];
  const params = [relationshipId, simId];
  let paramIndex = 3;

  if (is_active !== undefined) {
    setClauses.push(`is_active = $${paramIndex}`);
    params.push(is_active);
    paramIndex += 1;
  }
  if (started_date !== undefined) {
    setClauses.push(`started_date = $${paramIndex}`);
    params.push(started_date);
    paramIndex += 1;
  }
  if (ended_date !== undefined) {
    setClauses.push(`ended_date = $${paramIndex}`);
    params.push(ended_date);
    paramIndex += 1;
  }

  if (setClauses.length === 0) {
    return buildResponse(400, { error: "No valid fields to update" }, origin);
  }

  const pool = await getPool();

  const result = await pool.query(
    `UPDATE relationships
     SET ${setClauses.join(", ")}
     WHERE relationship_id = $1 AND (sim_id_1 = $2 OR sim_id_2 = $2)
     RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    return buildResponse(404, { error: "Relationship not found" }, origin);
  }

  return buildResponse(200, { data: result.rows[0] }, origin);
};

const removeSimRelationship = async (origin, simId, relationshipId) => {
  if (!isValidUuid(simId)) {
    return buildResponse(400, { error: "Invalid sim_id format" }, origin);
  }
  if (!isValidUuid(relationshipId)) {
    return buildResponse(400, { error: "Invalid relationship_id format" }, origin);
  }

  const pool = await getPool();
  const result = await pool.query(
    `DELETE FROM relationships
     WHERE relationship_id = $1 AND (sim_id_1 = $2 OR sim_id_2 = $2)
     RETURNING relationship_id`,
    [relationshipId, simId]
  );

  if (result.rows.length === 0) {
    return buildResponse(404, { error: "Relationship not found" }, origin);
  }

  return buildResponse(
    200,
    { data: { deleted: true, relationship_id: result.rows[0].relationship_id } },
    origin
  );
};

module.exports = {
  getSimRelationships,
  addSimRelationship,
  updateSimRelationship,
  removeSimRelationship,
};
