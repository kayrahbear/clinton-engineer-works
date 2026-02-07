const { getPool } = require("../db/pool");
const { buildResponse } = require("../utils/response");
const { isValidUuid, isValidDate, parseBody } = require("../utils/validation");
const { verifySimOwnership } = require("../utils/authorization");

const getSimMilestones = async (origin, userId, simId) => {
  if (!isValidUuid(simId)) {
    return buildResponse(400, { error: "Invalid sim_id format" }, origin);
  }

  if (!(await verifySimOwnership(simId, userId))) {
    return buildResponse(404, { error: "Sim not found" }, origin);
  }

  const pool = await getPool();
  const result = await pool.query(
    `SELECT sm.sim_id, sm.milestone_id, sm.achieved_date, sm.related_sim_id, sm.notes,
            m.milestone_name, m.description, m.category, m.min_age_group, m.max_age_group, m.pack_required
     FROM sim_milestones sm
     JOIN milestones m ON sm.milestone_id = m.milestone_id
     WHERE sm.sim_id = $1
     ORDER BY sm.achieved_date DESC, m.milestone_name ASC`,
    [simId]
  );

  return buildResponse(200, { data: result.rows }, origin);
};

const addSimMilestone = async (origin, userId, simId, body) => {
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

  const { milestone_id, achieved_date, related_sim_id, notes } = parsed;

  if (!milestone_id || !isValidUuid(milestone_id)) {
    return buildResponse(
      400,
      { error: "milestone_id is required and must be a valid UUID" },
      origin
    );
  }

  if (achieved_date !== undefined && achieved_date !== null && !isValidDate(achieved_date)) {
    return buildResponse(400, { error: "achieved_date must be a valid date" }, origin);
  }

  if (related_sim_id !== undefined && related_sim_id !== null && !isValidUuid(related_sim_id)) {
    return buildResponse(400, { error: "related_sim_id must be a valid UUID" }, origin);
  }

  const pool = await getPool();

  try {
    const result = await pool.query(
      `INSERT INTO sim_milestones (sim_id, milestone_id, achieved_date, related_sim_id, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        simId,
        milestone_id,
        achieved_date || null,
        related_sim_id || null,
        notes || null,
      ]
    );

    return buildResponse(201, { data: result.rows[0] }, origin);
  } catch (error) {
    if (error.code === "23503") {
      return buildResponse(
        400,
        { error: "Referenced sim or milestone does not exist" },
        origin
      );
    }
    if (error.code === "23505") {
      return buildResponse(409, { error: "This milestone is already assigned to this sim" }, origin);
    }
    throw error;
  }
};

const removeSimMilestone = async (origin, userId, simId, milestoneId) => {
  if (!isValidUuid(simId)) {
    return buildResponse(400, { error: "Invalid sim_id format" }, origin);
  }
  if (!isValidUuid(milestoneId)) {
    return buildResponse(400, { error: "Invalid milestone_id format" }, origin);
  }

  if (!(await verifySimOwnership(simId, userId))) {
    return buildResponse(404, { error: "Sim not found" }, origin);
  }

  const pool = await getPool();
  const result = await pool.query(
    `DELETE FROM sim_milestones
     WHERE sim_id = $1 AND milestone_id = $2
     RETURNING sim_id, milestone_id`,
    [simId, milestoneId]
  );

  if (result.rows.length === 0) {
    return buildResponse(404, { error: "Sim milestone not found" }, origin);
  }

  return buildResponse(200, { data: { deleted: true, ...result.rows[0] } }, origin);
};

module.exports = {
  getSimMilestones,
  addSimMilestone,
  removeSimMilestone,
};
