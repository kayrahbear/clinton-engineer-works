const { getPool } = require("../db/pool");
const { buildResponse } = require("../utils/response");
const { isPositiveInteger } = require("../utils/validation");

/**
 * GET /api/generation-templates - Get all generation templates
 */
const getAllGenerationTemplates = async (origin) => {
  const pool = await getPool();

  const result = await pool.query(
    `SELECT g.generation_number, g.pack_name, g.backstory,
            (SELECT COUNT(*) FROM generation_goals gg WHERE gg.generation_id = g.generation_id AND gg.is_optional = FALSE) AS required_goals_count,
            (SELECT COUNT(*) FROM generation_goals gg WHERE gg.generation_id = g.generation_id AND gg.is_optional = TRUE) AS optional_goals_count
     FROM generations g
     JOIN legacies l ON g.legacy_id = l.legacy_id
     WHERE l.legacy_name = 'Pack Legacy Challenge Template'
     ORDER BY g.generation_number`
  );

  return buildResponse(200, { data: result.rows }, origin);
};

/**
 * GET /api/generation-templates/:number - Get a specific generation template
 */
const getGenerationTemplateByNumber = async (origin, generationNumber) => {
  const genNum = parseInt(generationNumber, 10);

  if (!isPositiveInteger(genNum) || genNum < 1 || genNum > 35) {
    return buildResponse(
      400,
      { error: "Generation number must be an integer between 1 and 35" },
      origin
    );
  }

  const pool = await getPool();

  // Get the template generation
  const result = await pool.query(
    `SELECT g.generation_id, g.generation_number, g.pack_name, g.backstory
     FROM generations g
     JOIN legacies l ON g.legacy_id = l.legacy_id
     WHERE l.legacy_name = 'Pack Legacy Challenge Template'
       AND g.generation_number = $1`,
    [genNum]
  );

  if (result.rows.length === 0) {
    return buildResponse(404, { error: "Generation template not found" }, origin);
  }

  const template = result.rows[0];

  // Get required goals
  const goalsResult = await pool.query(
    `SELECT goal_text, is_optional
     FROM generation_goals
     WHERE generation_id = $1
     ORDER BY is_optional, goal_id`,
    [template.generation_id]
  );

  // Get required traits
  const traitsResult = await pool.query(
    `SELECT t.trait_id, t.trait_name, t.trait_type, t.pack_required, grt.trait_order
     FROM generation_required_traits grt
     JOIN traits t ON grt.trait_id = t.trait_id
     WHERE grt.generation_id = $1
     ORDER BY grt.trait_order`,
    [template.generation_id]
  );

  // Get required careers
  const careersResult = await pool.query(
    `SELECT c.career_id, c.career_name, c.career_type, c.pack_required,
            cb.branch_id, cb.branch_name
     FROM generation_required_careers grc
     JOIN careers c ON grc.career_id = c.career_id
     LEFT JOIN career_branches cb ON grc.branch_id = cb.branch_id
     WHERE grc.generation_id = $1`,
    [template.generation_id]
  );

  const requiredGoals = goalsResult.rows.filter((g) => !g.is_optional);
  const optionalGoals = goalsResult.rows.filter((g) => g.is_optional);

  return buildResponse(
    200,
    {
      data: {
        generation_number: template.generation_number,
        pack_name: template.pack_name,
        backstory: template.backstory,
        required_goals: requiredGoals.map((g) => g.goal_text),
        optional_goals: optionalGoals.map((g) => g.goal_text),
        required_traits: traitsResult.rows,
        required_careers: careersResult.rows,
      },
    },
    origin
  );
};

module.exports = {
  getAllGenerationTemplates,
  getGenerationTemplateByNumber,
};
