const { getPool } = require("../db/pool");
const { buildResponse } = require("../utils/response");
const { isValidUuid, isValidDate, parseBody } = require("../utils/validation");
const { verifyLegacyOwnership, verifyGenerationOwnership, verifyGoalOwnership } = require("../utils/authorization");

/**
 * GET /api/legacies/:legacyId/generations - Get all generations for a legacy
 */
const getGenerationsByLegacy = async (origin, userId, legacyId) => {
  if (!isValidUuid(legacyId)) {
    return buildResponse(400, { error: "Invalid legacy_id format" }, origin);
  }

  if (!(await verifyLegacyOwnership(legacyId, userId))) {
    return buildResponse(404, { error: "Legacy not found" }, origin);
  }

  const pool = await getPool();

  const result = await pool.query(
    `SELECT g.*,
            f.name AS founder_name,
            f.sim_id AS founder_sim_id,
            s.name AS heir_name,
            s.sim_id AS heir_sim_id,
            (SELECT COUNT(*) FROM generation_goals gg WHERE gg.generation_id = g.generation_id AND gg.is_completed = TRUE) AS completed_goals,
            (SELECT COUNT(*) FROM generation_goals gg WHERE gg.generation_id = g.generation_id) AS total_goals,
            (SELECT COUNT(*) FROM generation_goals gg WHERE gg.generation_id = g.generation_id AND gg.is_optional = FALSE AND gg.is_completed = TRUE) AS completed_required_goals,
            (SELECT COUNT(*) FROM generation_goals gg WHERE gg.generation_id = g.generation_id AND gg.is_optional = FALSE) AS total_required_goals
     FROM generations g
     LEFT JOIN sims f ON g.founder_id = f.sim_id
     LEFT JOIN sims s ON g.heir_id = s.sim_id
     WHERE g.legacy_id = $1
     ORDER BY g.generation_number`,
    [legacyId]
  );

  return buildResponse(200, { data: result.rows }, origin);
};

/**
 * GET /api/generations/:generationId - Get generation details
 */
const getGenerationById = async (origin, userId, generationId) => {
  if (!isValidUuid(generationId)) {
    return buildResponse(400, { error: "Invalid generation_id format" }, origin);
  }

  if (!(await verifyGenerationOwnership(generationId, userId))) {
    return buildResponse(404, { error: "Generation not found" }, origin);
  }

  const pool = await getPool();

  // Get generation with related data
  const result = await pool.query(
    `SELECT g.*,
            l.legacy_name,
            l.gender_law,
            l.bloodline_law,
            l.heir_law,
            l.species_law,
            f.name AS founder_name,
            f.sim_id AS founder_sim_id,
            s.name AS heir_name,
            s.sim_id AS heir_sim_id
     FROM generations g
     JOIN legacies l ON g.legacy_id = l.legacy_id
     LEFT JOIN sims f ON g.founder_id = f.sim_id
     LEFT JOIN sims s ON g.heir_id = s.sim_id
     WHERE g.generation_id = $1
       AND l.legacy_name != 'Pack Legacy Challenge Template'`,
    [generationId]
  );

  if (result.rows.length === 0) {
    return buildResponse(404, { error: "Generation not found" }, origin);
  }

  const generation = result.rows[0];

  // Get required traits
  const traitsResult = await pool.query(
    `SELECT t.trait_id, t.trait_name, t.trait_type, grt.trait_order
     FROM generation_required_traits grt
     JOIN traits t ON grt.trait_id = t.trait_id
     WHERE grt.generation_id = $1
     ORDER BY grt.trait_order`,
    [generationId]
  );

  // Get required careers
  const careersResult = await pool.query(
    `SELECT c.career_id, c.career_name, c.career_type, cb.branch_id, cb.branch_name
     FROM generation_required_careers grc
     JOIN careers c ON grc.career_id = c.career_id
     LEFT JOIN career_branches cb ON grc.branch_id = cb.branch_id
     WHERE grc.generation_id = $1`,
    [generationId]
  );

  // Get goal counts
  const goalsCount = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE is_completed = TRUE) AS completed,
       COUNT(*) FILTER (WHERE is_optional = FALSE) AS required_total,
       COUNT(*) FILTER (WHERE is_optional = FALSE AND is_completed = TRUE) AS required_completed,
       COUNT(*) FILTER (WHERE is_optional = TRUE) AS optional_total,
       COUNT(*) FILTER (WHERE is_optional = TRUE AND is_completed = TRUE) AS optional_completed
     FROM generation_goals
     WHERE generation_id = $1`,
    [generationId]
  );

  return buildResponse(
    200,
    {
      data: {
        ...generation,
        required_traits: traitsResult.rows,
        required_careers: careersResult.rows,
        goal_summary: goalsCount.rows[0],
      },
    },
    origin
  );
};

/**
 * POST /api/generations/:generationId/start - Start a generation (make it active)
 */
const startGeneration = async (origin, userId, generationId, body) => {
  if (!isValidUuid(generationId)) {
    return buildResponse(400, { error: "Invalid generation_id format" }, origin);
  }

  if (!(await verifyGenerationOwnership(generationId, userId))) {
    return buildResponse(404, { error: "Generation not found" }, origin);
  }

  const parsed = parseBody(body) || {};
  const { start_date, founder_id } = parsed;

  if (start_date && !isValidDate(start_date)) {
    return buildResponse(400, { error: "start_date must be a valid date" }, origin);
  }

  if (founder_id && !isValidUuid(founder_id)) {
    return buildResponse(400, { error: "founder_id must be a valid UUID" }, origin);
  }

  const pool = await getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Get the generation and its legacy
    const genResult = await client.query(
      `SELECT g.generation_id, g.legacy_id, g.generation_number, g.is_active,
              g.founder_id, l.legacy_name, l.founder_id AS legacy_founder_id
       FROM generations g
       JOIN legacies l ON g.legacy_id = l.legacy_id
       WHERE g.generation_id = $1
         AND l.legacy_name != 'Pack Legacy Challenge Template'`,
      [generationId]
    );

    if (genResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return buildResponse(404, { error: "Generation not found" }, origin);
    }

    const generation = genResult.rows[0];

    if (generation.is_active) {
      await client.query("ROLLBACK");
      return buildResponse(400, { error: "Generation is already active" }, origin);
    }

    // Determine the founder for this generation
    let resolvedFounderId = founder_id || generation.founder_id || null;

    if (!resolvedFounderId) {
      if (generation.generation_number === 1) {
        // Gen 1: founder is the legacy's founder
        resolvedFounderId = generation.legacy_founder_id;
      } else {
        // Gen N: founder is the previous generation's heir
        const prevGenResult = await client.query(
          `SELECT heir_id FROM generations
           WHERE legacy_id = $1 AND generation_number = $2`,
          [generation.legacy_id, generation.generation_number - 1]
        );
        if (prevGenResult.rows.length > 0 && prevGenResult.rows[0].heir_id) {
          resolvedFounderId = prevGenResult.rows[0].heir_id;
        }
      }
    }

    // Deactivate any currently active generation for this legacy
    await client.query(
      `UPDATE generations SET is_active = FALSE WHERE legacy_id = $1 AND is_active = TRUE`,
      [generation.legacy_id]
    );

    // Activate this generation and set founder
    const updateResult = await client.query(
      `UPDATE generations
       SET is_active = TRUE,
           start_date = COALESCE($2, start_date, CURRENT_DATE),
           founder_id = COALESCE($3, founder_id)
       WHERE generation_id = $1
       RETURNING *`,
      [generationId, start_date || null, resolvedFounderId]
    );

    // Update the legacy's current_generation
    await client.query(
      `UPDATE legacies SET current_generation = $2 WHERE legacy_id = $1`,
      [generation.legacy_id, generation.generation_number]
    );

    await client.query("COMMIT");

    return buildResponse(200, { data: updateResult.rows[0] }, origin);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * PUT /api/generations/:generationId/complete - Mark generation as complete
 */
const completeGeneration = async (origin, userId, generationId, body) => {
  if (!isValidUuid(generationId)) {
    return buildResponse(400, { error: "Invalid generation_id format" }, origin);
  }

  if (!(await verifyGenerationOwnership(generationId, userId))) {
    return buildResponse(404, { error: "Generation not found" }, origin);
  }

  const parsed = parseBody(body) || {};
  const { completion_date, heir_id } = parsed;

  if (completion_date && !isValidDate(completion_date)) {
    return buildResponse(400, { error: "completion_date must be a valid date" }, origin);
  }

  if (heir_id && !isValidUuid(heir_id)) {
    return buildResponse(400, { error: "heir_id must be a valid UUID" }, origin);
  }

  const pool = await getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Get the generation
    const genResult = await client.query(
      `SELECT g.generation_id, g.legacy_id, g.generation_number, g.is_active,
              g.heir_id AS current_heir_id, l.legacy_name
       FROM generations g
       JOIN legacies l ON g.legacy_id = l.legacy_id
       WHERE g.generation_id = $1
         AND l.legacy_name != 'Pack Legacy Challenge Template'`,
      [generationId]
    );

    if (genResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return buildResponse(404, { error: "Generation not found" }, origin);
    }

    const generation = genResult.rows[0];

    // Mark generation as complete
    const updateResult = await client.query(
      `UPDATE generations
       SET is_active = FALSE,
           completion_date = COALESCE($2, CURRENT_DATE),
           heir_id = COALESCE($3, heir_id)
       WHERE generation_id = $1
       RETURNING *`,
      [generationId, completion_date || null, heir_id || null]
    );

    // If heir_id provided, mark that sim as the heir
    if (heir_id) {
      await client.query(
        `UPDATE sims SET is_generation_heir = TRUE WHERE sim_id = $1`,
        [heir_id]
      );
    }

    // Determine the heir that will become the next generation's founder
    const nextFounderId = heir_id || generation.current_heir_id || null;

    // Auto-start the next generation if it exists
    const nextGenNumber = generation.generation_number + 1;
    const nextGenResult = await client.query(
      `SELECT generation_id FROM generations
       WHERE legacy_id = $1 AND generation_number = $2`,
      [generation.legacy_id, nextGenNumber]
    );

    if (nextGenResult.rows.length > 0) {
      await client.query(
        `UPDATE generations
         SET is_active = TRUE, start_date = CURRENT_DATE,
             founder_id = COALESCE($2, founder_id)
         WHERE generation_id = $1`,
        [nextGenResult.rows[0].generation_id, nextFounderId]
      );

      await client.query(
        `UPDATE legacies SET current_generation = $2 WHERE legacy_id = $1`,
        [generation.legacy_id, nextGenNumber]
      );
    }

    await client.query("COMMIT");

    return buildResponse(200, { data: updateResult.rows[0] }, origin);
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23503") {
      return buildResponse(400, { error: "Referenced heir_id does not exist" }, origin);
    }
    throw error;
  } finally {
    client.release();
  }
};

/**
 * GET /api/generations/:generationId/goals - Get all goals for a generation
 */
const getGenerationGoals = async (origin, userId, generationId) => {
  if (!isValidUuid(generationId)) {
    return buildResponse(400, { error: "Invalid generation_id format" }, origin);
  }

  if (!(await verifyGenerationOwnership(generationId, userId))) {
    return buildResponse(404, { error: "Generation not found" }, origin);
  }

  const pool = await getPool();

  const result = await pool.query(
    `SELECT gg.*,
            s.name AS completed_by_name
     FROM generation_goals gg
     LEFT JOIN sims s ON gg.completed_by_sim_id = s.sim_id
     WHERE gg.generation_id = $1
     ORDER BY gg.is_optional, gg.goal_id`,
    [generationId]
  );

  // Separate required and optional goals
  const required = result.rows.filter((g) => !g.is_optional);
  const optional = result.rows.filter((g) => g.is_optional);

  return buildResponse(
    200,
    {
      data: {
        required_goals: required,
        optional_goals: optional,
        summary: {
          required_completed: required.filter((g) => g.is_completed).length,
          required_total: required.length,
          optional_completed: optional.filter((g) => g.is_completed).length,
          optional_total: optional.length,
        },
      },
    },
    origin
  );
};

/**
 * PUT /api/goals/:goalId/complete - Mark a goal as complete (or incomplete)
 */
const updateGoalCompletion = async (origin, userId, goalId, body) => {
  if (!isValidUuid(goalId)) {
    return buildResponse(400, { error: "Invalid goal_id format" }, origin);
  }

  if (!(await verifyGoalOwnership(goalId, userId))) {
    return buildResponse(404, { error: "Goal not found" }, origin);
  }

  const parsed = parseBody(body);
  if (!parsed) {
    return buildResponse(400, { error: "Invalid or missing JSON body" }, origin);
  }

  const { is_completed, completion_date, completed_by_sim_id } = parsed;

  if (is_completed === undefined) {
    return buildResponse(400, { error: "is_completed is required" }, origin);
  }

  if (typeof is_completed !== "boolean") {
    return buildResponse(400, { error: "is_completed must be a boolean" }, origin);
  }

  if (completion_date && !isValidDate(completion_date)) {
    return buildResponse(400, { error: "completion_date must be a valid date" }, origin);
  }

  if (completed_by_sim_id && !isValidUuid(completed_by_sim_id)) {
    return buildResponse(400, { error: "completed_by_sim_id must be a valid UUID" }, origin);
  }

  const pool = await getPool();

  try {
    const result = await pool.query(
      `UPDATE generation_goals
       SET is_completed = $2,
           completion_date = CASE WHEN $2 = TRUE THEN COALESCE($3, CURRENT_DATE) ELSE NULL END,
           completed_by_sim_id = CASE WHEN $2 = TRUE THEN $4::uuid ELSE NULL END
       WHERE goal_id = $1
       RETURNING *`,
      [goalId, is_completed, completion_date || null, completed_by_sim_id || null]
    );

    return buildResponse(200, { data: result.rows[0] }, origin);
  } catch (error) {
    if (error.code === "23503") {
      return buildResponse(400, { error: "Referenced sim does not exist" }, origin);
    }
    throw error;
  }
};

module.exports = {
  getGenerationsByLegacy,
  getGenerationById,
  startGeneration,
  completeGeneration,
  getGenerationGoals,
  updateGoalCompletion,
};
