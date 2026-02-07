const { getPool } = require("../db/pool");

/**
 * Verify that a legacy belongs to the given user.
 * Returns true if owned, false otherwise.
 */
const verifyLegacyOwnership = async (legacyId, userId) => {
  const pool = await getPool();
  const result = await pool.query(
    `SELECT legacy_id FROM legacies WHERE legacy_id = $1 AND user_id = $2`,
    [legacyId, userId]
  );
  return result.rows.length > 0;
};

/**
 * Verify that a sim belongs to a legacy owned by the given user.
 * Returns true if owned, false otherwise.
 */
const verifySimOwnership = async (simId, userId) => {
  const pool = await getPool();
  const result = await pool.query(
    `SELECT s.sim_id FROM sims s
     JOIN legacies l ON s.legacy_id = l.legacy_id
     WHERE s.sim_id = $1 AND l.user_id = $2`,
    [simId, userId]
  );
  return result.rows.length > 0;
};

/**
 * Verify that a generation belongs to a legacy owned by the given user.
 * Returns true if owned, false otherwise.
 */
const verifyGenerationOwnership = async (generationId, userId) => {
  const pool = await getPool();
  const result = await pool.query(
    `SELECT g.generation_id FROM generations g
     JOIN legacies l ON g.legacy_id = l.legacy_id
     WHERE g.generation_id = $1 AND l.user_id = $2`,
    [generationId, userId]
  );
  return result.rows.length > 0;
};

/**
 * Verify that a goal belongs to a legacy owned by the given user.
 * Returns true if owned, false otherwise.
 */
const verifyGoalOwnership = async (goalId, userId) => {
  const pool = await getPool();
  const result = await pool.query(
    `SELECT gg.goal_id FROM generation_goals gg
     JOIN generations g ON gg.generation_id = g.generation_id
     JOIN legacies l ON g.legacy_id = l.legacy_id
     WHERE gg.goal_id = $1 AND l.user_id = $2`,
    [goalId, userId]
  );
  return result.rows.length > 0;
};

module.exports = {
  verifyLegacyOwnership,
  verifySimOwnership,
  verifyGenerationOwnership,
  verifyGoalOwnership,
};
