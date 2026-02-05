const { getPool } = require("../db/pool");
const { buildResponse } = require("../utils/response");
const { isValidUuid } = require("../utils/validation");

const MAX_DEPTH = 35;

const getSimFamilyTree = async (origin, simId) => {
  if (!isValidUuid(simId)) {
    return buildResponse(400, { error: "Invalid sim_id format" }, origin);
  }

  const pool = await getPool();

  const simResult = await pool.query(
    `SELECT s.sim_id, s.name, s.mother_id, s.father_id, s.generation_id,
            s.life_stage, s.portrait, s.status, g.generation_number
     FROM sims s
     LEFT JOIN generations g ON s.generation_id = g.generation_id
     WHERE s.sim_id = $1 AND s.status != 'deleted'`,
    [simId]
  );

  if (simResult.rows.length === 0) {
    return buildResponse(404, { error: "Sim not found" }, origin);
  }

  const sim = simResult.rows[0];

  const ancestorsResult = await pool.query(
    `WITH RECURSIVE ancestors AS (
      SELECT s.sim_id, s.name, s.mother_id, s.father_id, s.generation_id,
             s.life_stage, s.portrait, s.status, g.generation_number, 0 AS depth
      FROM sims s
      LEFT JOIN generations g ON s.generation_id = g.generation_id
      WHERE s.sim_id = $1 AND s.status != 'deleted'
      UNION ALL
      SELECT s.sim_id, s.name, s.mother_id, s.father_id, s.generation_id,
             s.life_stage, s.portrait, s.status, g.generation_number, a.depth + 1
      FROM sims s
      LEFT JOIN generations g ON s.generation_id = g.generation_id
      JOIN ancestors a ON s.sim_id = a.mother_id OR s.sim_id = a.father_id
      WHERE s.status != 'deleted' AND a.depth < $2
    )
    SELECT * FROM ancestors WHERE depth > 0 ORDER BY depth ASC`,
    [simId, MAX_DEPTH]
  );

  const descendantsResult = await pool.query(
    `WITH RECURSIVE descendants AS (
      SELECT s.sim_id, s.name, s.mother_id, s.father_id, s.generation_id,
             s.life_stage, s.portrait, s.status, g.generation_number, 0 AS depth
      FROM sims s
      LEFT JOIN generations g ON s.generation_id = g.generation_id
      WHERE s.sim_id = $1 AND s.status != 'deleted'
      UNION ALL
      SELECT s.sim_id, s.name, s.mother_id, s.father_id, s.generation_id,
             s.life_stage, s.portrait, s.status, g.generation_number, d.depth + 1
      FROM sims s
      LEFT JOIN generations g ON s.generation_id = g.generation_id
      JOIN descendants d ON s.mother_id = d.sim_id OR s.father_id = d.sim_id
      WHERE s.status != 'deleted' AND d.depth < $2
    )
    SELECT * FROM descendants WHERE depth > 0 ORDER BY depth ASC`,
    [simId, MAX_DEPTH]
  );

  return buildResponse(
    200,
    {
      data: {
        sim,
        ancestors: ancestorsResult.rows,
        descendants: descendantsResult.rows,
      },
    },
    origin
  );
};

module.exports = {
  getSimFamilyTree,
};
