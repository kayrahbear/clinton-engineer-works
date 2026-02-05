const { getPool } = require("../db/pool");
const { buildResponse } = require("../utils/response");
const { isValidUuid, isValidDate, parseBody } = require("../utils/validation");

const VALID_GENDER_LAWS = [
  "matriarchy",
  "strict_matriarchy",
  "patriarchy",
  "strict_patriarchy",
  "equality",
  "strict_equality",
];

const VALID_BLOODLINE_LAWS = [
  "strict_traditional",
  "traditional",
  "modern",
  "foster",
  "strict_foster",
];

const VALID_HEIR_LAWS = [
  "first_born",
  "last_born",
  "living_will",
  "merit",
  "strength",
  "random",
  "exemplar",
  "democracy",
  "magical_bloodline",
  "magical_strength",
];

const VALID_SPECIES_LAWS = ["xenoarchy", "xenophobic", "brood", "tolerant"];

const TEXT_LIMITS = {
  legacy_name: 200,
};

const validateTextLength = (field, value) => {
  const limit = TEXT_LIMITS[field];
  if (limit && typeof value === "string" && value.length > limit) {
    return `${field} must be ${limit} characters or fewer`;
  }
  return null;
};

/**
 * Clones generation templates from the Pack Legacy Challenge Template
 * into a new legacy.
 */
const cloneGenerationTemplates = async (pool, legacyId, startingGeneration = 1) => {
  // Find the template legacy
  const templateResult = await pool.query(
    `SELECT legacy_id FROM legacies WHERE legacy_name = $1`,
    ["Pack Legacy Challenge Template"]
  );

  if (templateResult.rows.length === 0) {
    console.warn("Pack Legacy Challenge Template not found - skipping generation cloning");
    return;
  }

  const templateLegacyId = templateResult.rows[0].legacy_id;

  // Get template generations
  const templateGens = await pool.query(
    `SELECT generation_id, generation_number, pack_name, backstory
     FROM generations
     WHERE legacy_id = $1
     ORDER BY generation_number`,
    [templateLegacyId]
  );

  for (const templateGen of templateGens.rows) {
    const isActive = templateGen.generation_number === startingGeneration;

    // Insert the new generation
    const newGenResult = await pool.query(
      `INSERT INTO generations (legacy_id, generation_number, pack_name, backstory, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING generation_id`,
      [legacyId, templateGen.generation_number, templateGen.pack_name, templateGen.backstory, isActive]
    );
    const newGenId = newGenResult.rows[0].generation_id;

    // Clone goals
    await pool.query(
      `INSERT INTO generation_goals (generation_id, goal_text, is_optional)
       SELECT $1, goal_text, is_optional
       FROM generation_goals
       WHERE generation_id = $2`,
      [newGenId, templateGen.generation_id]
    );

    // Clone required traits
    await pool.query(
      `INSERT INTO generation_required_traits (generation_id, trait_id, trait_order)
       SELECT $1, trait_id, trait_order
       FROM generation_required_traits
       WHERE generation_id = $2`,
      [newGenId, templateGen.generation_id]
    );

    // Clone required careers
    await pool.query(
      `INSERT INTO generation_required_careers (generation_id, career_id, branch_id)
       SELECT $1, career_id, branch_id
       FROM generation_required_careers
       WHERE generation_id = $2`,
      [newGenId, templateGen.generation_id]
    );
  }
};

/**
 * POST /api/legacies - Create a new legacy
 */
const createLegacy = async (origin, body) => {
  const parsed = parseBody(body);
  if (!parsed) {
    return buildResponse(400, { error: "Invalid or missing JSON body" }, origin);
  }

  const {
    legacy_name,
    start_date,
    starting_generation,
    gender_law,
    bloodline_law,
    heir_law,
    species_law,
  } = parsed;

  // Validate legacy_name
  if (!legacy_name || typeof legacy_name !== "string" || legacy_name.trim().length === 0) {
    return buildResponse(400, { error: "legacy_name is required" }, origin);
  }

  const nameLenErr = validateTextLength("legacy_name", legacy_name);
  if (nameLenErr) {
    return buildResponse(400, { error: nameLenErr }, origin);
  }

  // Validate start_date if provided
  if (start_date && !isValidDate(start_date)) {
    return buildResponse(400, { error: "start_date must be a valid date" }, origin);
  }

  // Validate starting_generation if provided
  const startGen = starting_generation || 1;
  if (!Number.isInteger(startGen) || startGen < 1 || startGen > 35) {
    return buildResponse(
      400,
      { error: "starting_generation must be an integer between 1 and 35" },
      origin
    );
  }

  // Validate succession laws
  const genderLaw = gender_law || "equality";
  if (!VALID_GENDER_LAWS.includes(genderLaw)) {
    return buildResponse(
      400,
      { error: `gender_law must be one of: ${VALID_GENDER_LAWS.join(", ")}` },
      origin
    );
  }

  const bloodlineLaw = bloodline_law || "traditional";
  if (!VALID_BLOODLINE_LAWS.includes(bloodlineLaw)) {
    return buildResponse(
      400,
      { error: `bloodline_law must be one of: ${VALID_BLOODLINE_LAWS.join(", ")}` },
      origin
    );
  }

  const heirLaw = heir_law || "first_born";
  if (!VALID_HEIR_LAWS.includes(heirLaw)) {
    return buildResponse(
      400,
      { error: `heir_law must be one of: ${VALID_HEIR_LAWS.join(", ")}` },
      origin
    );
  }

  const speciesLaw = species_law || "tolerant";
  if (!VALID_SPECIES_LAWS.includes(speciesLaw)) {
    return buildResponse(
      400,
      { error: `species_law must be one of: ${VALID_SPECIES_LAWS.join(", ")}` },
      origin
    );
  }

  const pool = await getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create the legacy
    const result = await client.query(
      `INSERT INTO legacies (
        legacy_name, start_date, current_generation,
        gender_law, bloodline_law, heir_law, species_law
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        legacy_name.trim(),
        start_date || null,
        startGen,
        genderLaw,
        bloodlineLaw,
        heirLaw,
        speciesLaw,
      ]
    );

    const newLegacy = result.rows[0];

    // Clone generation templates
    await cloneGenerationTemplates(client, newLegacy.legacy_id, startGen);

    await client.query("COMMIT");

    return buildResponse(201, { data: newLegacy }, origin);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * GET /api/legacies/:legacyId - Get legacy details
 */
const getLegacyById = async (origin, legacyId) => {
  if (!isValidUuid(legacyId)) {
    return buildResponse(400, { error: "Invalid legacy_id format" }, origin);
  }

  const pool = await getPool();

  // Get legacy with current generation info
  const result = await pool.query(
    `SELECT l.*,
            g.generation_id AS current_generation_id,
            g.pack_name AS current_pack_name,
            g.backstory AS current_backstory,
            f.name AS founder_name
     FROM legacies l
     LEFT JOIN generations g ON l.legacy_id = g.legacy_id AND g.is_active = TRUE
     LEFT JOIN sims f ON l.founder_id = f.sim_id
     WHERE l.legacy_id = $1
       AND l.legacy_name != 'Pack Legacy Challenge Template'`,
    [legacyId]
  );

  if (result.rows.length === 0) {
    return buildResponse(404, { error: "Legacy not found" }, origin);
  }

  return buildResponse(200, { data: result.rows[0] }, origin);
};

/**
 * GET /api/legacies - Get all legacies (excludes template)
 */
const getAllLegacies = async (origin) => {
  const pool = await getPool();

  const result = await pool.query(
    `SELECT l.*,
            g.pack_name AS current_pack_name,
            f.name AS founder_name
     FROM legacies l
     LEFT JOIN generations g ON l.legacy_id = g.legacy_id AND g.is_active = TRUE
     LEFT JOIN sims f ON l.founder_id = f.sim_id
     WHERE l.legacy_name != 'Pack Legacy Challenge Template'
     ORDER BY l.created_at DESC`
  );

  return buildResponse(200, { data: result.rows }, origin);
};

/**
 * PUT /api/legacies/:legacyId - Update a legacy
 */
const updateLegacy = async (origin, legacyId, body) => {
  if (!isValidUuid(legacyId)) {
    return buildResponse(400, { error: "Invalid legacy_id format" }, origin);
  }

  const parsed = parseBody(body);
  if (!parsed) {
    return buildResponse(400, { error: "Invalid or missing JSON body" }, origin);
  }

  const allowedFields = [
    "legacy_name",
    "founder_id",
    "start_date",
    "current_generation",
    "gender_law",
    "bloodline_law",
    "heir_law",
    "species_law",
    "current_household_wealth",
    "total_wealth_accumulated",
    "total_sims_born",
    "total_deaths",
  ];

  const setClauses = [];
  const params = [legacyId];
  let paramIndex = 2;

  for (const field of allowedFields) {
    if (!(field in parsed)) {
      continue;
    }

    const value = parsed[field];

    // Validate specific fields
    if (field === "legacy_name") {
      if (!value || typeof value !== "string" || value.trim().length === 0) {
        return buildResponse(400, { error: "legacy_name cannot be empty" }, origin);
      }
      const lenErr = validateTextLength("legacy_name", value);
      if (lenErr) {
        return buildResponse(400, { error: lenErr }, origin);
      }
    }

    if (field === "founder_id" && value && !isValidUuid(value)) {
      return buildResponse(400, { error: "founder_id must be a valid UUID" }, origin);
    }

    if (field === "start_date" && value && !isValidDate(value)) {
      return buildResponse(400, { error: "start_date must be a valid date" }, origin);
    }

    if (field === "current_generation") {
      if (!Number.isInteger(value) || value < 1 || value > 35) {
        return buildResponse(
          400,
          { error: "current_generation must be an integer between 1 and 35" },
          origin
        );
      }
    }

    if (field === "gender_law" && !VALID_GENDER_LAWS.includes(value)) {
      return buildResponse(
        400,
        { error: `gender_law must be one of: ${VALID_GENDER_LAWS.join(", ")}` },
        origin
      );
    }

    if (field === "bloodline_law" && !VALID_BLOODLINE_LAWS.includes(value)) {
      return buildResponse(
        400,
        { error: `bloodline_law must be one of: ${VALID_BLOODLINE_LAWS.join(", ")}` },
        origin
      );
    }

    if (field === "heir_law" && !VALID_HEIR_LAWS.includes(value)) {
      return buildResponse(
        400,
        { error: `heir_law must be one of: ${VALID_HEIR_LAWS.join(", ")}` },
        origin
      );
    }

    if (field === "species_law" && !VALID_SPECIES_LAWS.includes(value)) {
      return buildResponse(
        400,
        { error: `species_law must be one of: ${VALID_SPECIES_LAWS.join(", ")}` },
        origin
      );
    }

    if (["current_household_wealth", "total_wealth_accumulated"].includes(field)) {
      if (typeof value !== "number" || value < 0) {
        return buildResponse(400, { error: `${field} must be a non-negative number` }, origin);
      }
    }

    if (["total_sims_born", "total_deaths"].includes(field)) {
      if (!Number.isInteger(value) || value < 0) {
        return buildResponse(400, { error: `${field} must be a non-negative integer` }, origin);
      }
    }

    setClauses.push(`${field} = $${paramIndex}`);
    params.push(field === "legacy_name" ? value.trim() : value);
    paramIndex += 1;
  }

  if (setClauses.length === 0) {
    return buildResponse(400, { error: "No valid fields to update" }, origin);
  }

  const pool = await getPool();

  try {
    const result = await pool.query(
      `UPDATE legacies
       SET ${setClauses.join(", ")}
       WHERE legacy_id = $1
         AND legacy_name != 'Pack Legacy Challenge Template'
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return buildResponse(404, { error: "Legacy not found" }, origin);
    }

    return buildResponse(200, { data: result.rows[0] }, origin);
  } catch (error) {
    if (error.code === "23503") {
      return buildResponse(400, { error: "Referenced record does not exist" }, origin);
    }
    throw error;
  }
};

/**
 * GET /api/legacies/:legacyId/stats - Get aggregated statistics for a legacy
 */
const getLegacyStats = async (origin, legacyId) => {
  if (!isValidUuid(legacyId)) {
    return buildResponse(400, { error: "Invalid legacy_id format" }, origin);
  }

  const pool = await getPool();

  // Verify legacy exists
  const legacyCheck = await pool.query(
    `SELECT legacy_id, legacy_name, current_household_wealth, total_wealth_accumulated,
            total_sims_born, total_deaths, current_generation
     FROM legacies
     WHERE legacy_id = $1 AND legacy_name != 'Pack Legacy Challenge Template'`,
    [legacyId]
  );

  if (legacyCheck.rows.length === 0) {
    return buildResponse(404, { error: "Legacy not found" }, origin);
  }

  const legacy = legacyCheck.rows[0];

  // Get sim counts by status
  const simStats = await pool.query(
    `SELECT
       COUNT(*) AS total_sims,
       COUNT(*) FILTER (WHERE status = 'alive') AS living_sims,
       COUNT(*) FILTER (WHERE status = 'dead') AS deceased_sims,
       COUNT(*) FILTER (WHERE status = 'moved_out') AS moved_out_sims,
       COUNT(*) FILTER (WHERE current_household = TRUE AND status = 'alive') AS household_members,
       COUNT(*) FILTER (WHERE is_heir = TRUE) AS total_heirs
     FROM sims
     WHERE legacy_id = $1 AND status != 'deleted'`,
    [legacyId]
  );

  // Get generation progress
  const genStats = await pool.query(
    `SELECT
       COUNT(*) AS total_generations,
       COUNT(*) FILTER (WHERE completion_date IS NOT NULL) AS completed_generations,
       COUNT(*) FILTER (WHERE is_active = TRUE) AS active_generations
     FROM generations
     WHERE legacy_id = $1`,
    [legacyId]
  );

  // Get goal progress
  const goalStats = await pool.query(
    `SELECT
       COUNT(*) AS total_goals,
       COUNT(*) FILTER (WHERE is_completed = TRUE) AS completed_goals,
       COUNT(*) FILTER (WHERE is_optional = FALSE) AS required_goals,
       COUNT(*) FILTER (WHERE is_optional = FALSE AND is_completed = TRUE) AS completed_required_goals,
       COUNT(*) FILTER (WHERE is_optional = TRUE) AS optional_goals,
       COUNT(*) FILTER (WHERE is_optional = TRUE AND is_completed = TRUE) AS completed_optional_goals
     FROM generation_goals gg
     JOIN generations g ON gg.generation_id = g.generation_id
     WHERE g.legacy_id = $1`,
    [legacyId]
  );

  // Get collection progress
  const collectionStats = await pool.query(
    `SELECT
       COUNT(DISTINCT lci.collection_id) AS collections_started,
       COUNT(DISTINCT CASE WHEN lc.is_completed THEN lc.collection_id END) AS collections_completed,
       COUNT(lci.item_id) AS items_collected
     FROM legacy_collection_items lci
     LEFT JOIN legacy_collections lc ON lci.legacy_id = lc.legacy_id AND lci.collection_id = lc.collection_id
     WHERE lci.legacy_id = $1`,
    [legacyId]
  );

  // Get life stage distribution
  const lifeStageStats = await pool.query(
    `SELECT life_stage, COUNT(*) AS count
     FROM sims
     WHERE legacy_id = $1 AND status = 'alive'
     GROUP BY life_stage
     ORDER BY
       CASE life_stage
         WHEN 'infant' THEN 1
         WHEN 'toddler' THEN 2
         WHEN 'child' THEN 3
         WHEN 'teen' THEN 4
         WHEN 'young_adult' THEN 5
         WHEN 'adult' THEN 6
         WHEN 'elder' THEN 7
       END`,
    [legacyId]
  );

  // Get occult distribution
  const occultStats = await pool.query(
    `SELECT occult_type, COUNT(*) AS count
     FROM sims
     WHERE legacy_id = $1 AND status != 'deleted'
     GROUP BY occult_type
     ORDER BY count DESC`,
    [legacyId]
  );

  return buildResponse(
    200,
    {
      data: {
        legacy_name: legacy.legacy_name,
        current_generation: legacy.current_generation,
        wealth: {
          current_household: parseFloat(legacy.current_household_wealth) || 0,
          total_accumulated: parseFloat(legacy.total_wealth_accumulated) || 0,
        },
        sims: {
          ...simStats.rows[0],
          total_born: legacy.total_sims_born,
          total_deaths: legacy.total_deaths,
        },
        generations: genStats.rows[0],
        goals: goalStats.rows[0],
        collections: collectionStats.rows[0],
        life_stages: lifeStageStats.rows,
        occult_types: occultStats.rows,
      },
    },
    origin
  );
};

module.exports = {
  createLegacy,
  getLegacyById,
  getAllLegacies,
  updateLegacy,
  getLegacyStats,
};
