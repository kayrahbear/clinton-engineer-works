const { getPool } = require("../db/pool");
const { buildResponse } = require("../utils/response");
const {
  isValidUuid,
  isValidDate,
  isBoolean,
  parseBody,
} = require("../utils/validation");

const VALID_LIFE_STAGES = [
  "infant",
  "toddler",
  "child",
  "teen",
  "young_adult",
  "adult",
  "elder",
];

const VALID_OCCULT_TYPES = [
  "human",
  "alien",
  "vampire",
  "spellcaster",
  "werewolf",
  "mermaid",
  "servo",
  "ghost",
];

const VALID_STATUSES = ["alive", "dead", "moved_out"];

const TEXT_LIMITS = {
  name: 200,
  gender: 50,
  pronouns: 50,
  portrait: 2048,
  cause_of_death: 200,
  buried_location: 200,
  notes: 5000,
};

const validateTextLength = (field, value) => {
  const limit = TEXT_LIMITS[field];
  if (limit && typeof value === "string" && value.length > limit) {
    return `${field} must be ${limit} characters or fewer`;
  }
  return null;
};

const FK_ERROR_MESSAGE =
  "Referenced record does not exist. Verify legacy_id, generation_id, and parent IDs.";

const createSim = async (origin, body) => {
  const parsed = parseBody(body);
  if (!parsed) {
    return buildResponse(400, { error: "Invalid or missing JSON body" }, origin);
  }

  const {
    legacy_id,
    generation_id,
    name,
    gender,
    pronouns,
    portrait,
    life_stage,
    occult_type,
    cause_of_death,
    death_date,
    buried_location,
    mother_id,
    father_id,
    birth_date,
    world_of_residence_id,
    current_household,
    is_generation_heir,
    is_founder,
    notes,
  } = parsed;

  if (!legacy_id || !isValidUuid(legacy_id)) {
    return buildResponse(
      400,
      { error: "legacy_id is required and must be a valid UUID" },
      origin
    );
  }

  if (!generation_id || !isValidUuid(generation_id)) {
    return buildResponse(
      400,
      { error: "generation_id is required and must be a valid UUID" },
      origin
    );
  }

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return buildResponse(400, { error: "name is required" }, origin);
  }

  const nameLenErr = validateTextLength("name", name);
  if (nameLenErr) {
    return buildResponse(400, { error: nameLenErr }, origin);
  }

  if (!gender || typeof gender !== "string" || gender.trim().length === 0) {
    return buildResponse(400, { error: "gender is required" }, origin);
  }

  const genderLenErr = validateTextLength("gender", gender);
  if (genderLenErr) {
    return buildResponse(400, { error: genderLenErr }, origin);
  }

  for (const field of ["pronouns", "portrait", "cause_of_death", "buried_location", "notes"]) {
    const val = parsed[field];
    if (val) {
      const lenErr = validateTextLength(field, val);
      if (lenErr) {
        return buildResponse(400, { error: lenErr }, origin);
      }
    }
  }

  const lifeStage = life_stage || "young_adult";
  if (!VALID_LIFE_STAGES.includes(lifeStage)) {
    return buildResponse(
      400,
      { error: `life_stage must be one of: ${VALID_LIFE_STAGES.join(", ")}` },
      origin
    );
  }

  const occult = occult_type || "human";
  if (!VALID_OCCULT_TYPES.includes(occult)) {
    return buildResponse(
      400,
      { error: `occult_type must be one of: ${VALID_OCCULT_TYPES.join(", ")}` },
      origin
    );
  }

  if (mother_id && !isValidUuid(mother_id)) {
    return buildResponse(
      400,
      { error: "mother_id must be a valid UUID" },
      origin
    );
  }

  if (father_id && !isValidUuid(father_id)) {
    return buildResponse(
      400,
      { error: "father_id must be a valid UUID" },
      origin
    );
  }

  if (world_of_residence_id && !isValidUuid(world_of_residence_id)) {
    return buildResponse(
      400,
      { error: "world_of_residence_id must be a valid UUID" },
      origin
    );
  }

  if (birth_date && !isValidDate(birth_date)) {
    return buildResponse(400, { error: "birth_date must be a valid date" }, origin);
  }

  if (death_date && !isValidDate(death_date)) {
    return buildResponse(400, { error: "death_date must be a valid date" }, origin);
  }

  if (current_household !== undefined && current_household !== null && !isBoolean(current_household)) {
    return buildResponse(400, { error: "current_household must be a boolean" }, origin);
  }

  if (is_generation_heir !== undefined && is_generation_heir !== null && !isBoolean(is_generation_heir)) {
    return buildResponse(400, { error: "is_generation_heir must be a boolean" }, origin);
  }

  if (is_founder !== undefined && is_founder !== null && !isBoolean(is_founder)) {
    return buildResponse(400, { error: "is_founder must be a boolean" }, origin);
  }

  const pool = await getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO sims (
        legacy_id, generation_id, name, gender, pronouns, portrait,
        life_stage, occult_type, cause_of_death, death_date, buried_location,
        mother_id, father_id, birth_date, world_of_residence_id,
        current_household, is_generation_heir, is_founder, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16, $17, $18, $19
      ) RETURNING *`,
      [
        legacy_id,
        generation_id,
        name.trim(),
        gender.trim(),
        pronouns || null,
        portrait || null,
        lifeStage,
        occult,
        cause_of_death || null,
        death_date || null,
        buried_location || null,
        mother_id || null,
        father_id || null,
        birth_date || null,
        world_of_residence_id || null,
        current_household ?? false,
        is_generation_heir ?? false,
        is_founder ?? false,
        notes || null,
      ]
    );

    const newSim = result.rows[0];

    // If this sim is the founder, link them to the legacy
    if (newSim.is_founder) {
      await client.query(
        `UPDATE legacies SET founder_id = $1 WHERE legacy_id = $2`,
        [newSim.sim_id, newSim.legacy_id]
      );
    }

    await client.query("COMMIT");

    return buildResponse(201, { data: newSim }, origin);
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23503") {
      return buildResponse(400, { error: FK_ERROR_MESSAGE }, origin);
    }
    throw error;
  } finally {
    client.release();
  }
};

const getSimById = async (origin, simId) => {
  if (!isValidUuid(simId)) {
    return buildResponse(400, { error: "Invalid sim_id format" }, origin);
  }

  const pool = await getPool();
  const result = await pool.query(
    `SELECT s.*,
            w.world_name,
            m.name AS mother_name,
            f.name AS father_name
     FROM sims s
     LEFT JOIN worlds w ON s.world_of_residence_id = w.world_id
     LEFT JOIN sims m ON s.mother_id = m.sim_id
     LEFT JOIN sims f ON s.father_id = f.sim_id
     WHERE s.sim_id = $1 AND s.status != 'deleted'`,
    [simId]
  );

  if (result.rows.length === 0) {
    return buildResponse(404, { error: "Sim not found" }, origin);
  }

  return buildResponse(200, { data: result.rows[0] }, origin);
};

const getSimsByLegacy = async (origin, legacyId, queryParams) => {
  if (!isValidUuid(legacyId)) {
    return buildResponse(400, { error: "Invalid legacy_id format" }, origin);
  }

  const conditions = ["s.legacy_id = $1", "s.status != 'deleted'"];
  const params = [legacyId];
  let paramIndex = 2;

  if (queryParams.generation_id) {
    if (!isValidUuid(queryParams.generation_id)) {
      return buildResponse(
        400,
        { error: "Invalid generation_id format" },
        origin
      );
    }
    conditions.push(`s.generation_id = $${paramIndex}`);
    params.push(queryParams.generation_id);
    paramIndex += 1;
  }

  if (queryParams.status) {
    if (!VALID_STATUSES.includes(queryParams.status)) {
      return buildResponse(
        400,
        { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
        origin
      );
    }
    conditions.push(`s.status = $${paramIndex}`);
    params.push(queryParams.status);
    paramIndex += 1;
  }

  if (queryParams.current_household === "true") {
    conditions.push("s.current_household = TRUE");
  }

  if (queryParams.is_generation_heir === "true") {
    conditions.push("s.is_generation_heir = TRUE");
  }

  const pool = await getPool();
  const result = await pool.query(
    `SELECT s.*,
            w.world_name,
            m.name AS mother_name,
            f.name AS father_name,
            g.generation_number
     FROM sims s
     LEFT JOIN worlds w ON s.world_of_residence_id = w.world_id
     LEFT JOIN sims m ON s.mother_id = m.sim_id
     LEFT JOIN sims f ON s.father_id = f.sim_id
     LEFT JOIN generations g ON s.generation_id = g.generation_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY g.generation_number ASC, s.created_at ASC`,
    params
  );

  return buildResponse(200, { data: result.rows }, origin);
};

const updateSim = async (origin, simId, body) => {
  if (!isValidUuid(simId)) {
    return buildResponse(400, { error: "Invalid sim_id format" }, origin);
  }

  const parsed = parseBody(body);
  if (!parsed) {
    return buildResponse(400, { error: "Invalid or missing JSON body" }, origin);
  }

  const allowedFields = [
    "name",
    "gender",
    "pronouns",
    "portrait",
    "life_stage",
    "occult_type",
    "status",
    "cause_of_death",
    "death_date",
    "buried_location",
    "mother_id",
    "father_id",
    "birth_date",
    "world_of_residence_id",
    "current_household",
    "is_generation_heir",
    "is_founder",
    "notes",
  ];

  const setClauses = [];
  const params = [simId];
  let paramIndex = 2;

  for (const field of allowedFields) {
    if (!(field in parsed)) {
      continue;
    }

    const value = parsed[field];

    if (field in TEXT_LIMITS && value) {
      const lenErr = validateTextLength(field, value);
      if (lenErr) {
        return buildResponse(400, { error: lenErr }, origin);
      }
    }

    if (field === "life_stage" && value && !VALID_LIFE_STAGES.includes(value)) {
      return buildResponse(
        400,
        {
          error: `life_stage must be one of: ${VALID_LIFE_STAGES.join(", ")}`,
        },
        origin
      );
    }

    if (
      field === "occult_type" &&
      value &&
      !VALID_OCCULT_TYPES.includes(value)
    ) {
      return buildResponse(
        400,
        {
          error: `occult_type must be one of: ${VALID_OCCULT_TYPES.join(", ")}`,
        },
        origin
      );
    }

    if (field === "status" && value && !VALID_STATUSES.includes(value)) {
      return buildResponse(
        400,
        { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
        origin
      );
    }

    if (
      ["mother_id", "father_id", "world_of_residence_id"].includes(field) &&
      value &&
      !isValidUuid(value)
    ) {
      return buildResponse(
        400,
        { error: `${field} must be a valid UUID` },
        origin
      );
    }

    if (["birth_date", "death_date"].includes(field) && value && !isValidDate(value)) {
      return buildResponse(
        400,
        { error: `${field} must be a valid date` },
        origin
      );
    }

    if (
      ["current_household", "is_generation_heir", "is_founder"].includes(field) &&
      value !== null &&
      !isBoolean(value)
    ) {
      return buildResponse(
        400,
        { error: `${field} must be a boolean` },
        origin
      );
    }

    setClauses.push(`${field} = $${paramIndex}`);
    params.push(value);
    paramIndex += 1;
  }

  if (setClauses.length === 0) {
    return buildResponse(400, { error: "No valid fields to update" }, origin);
  }

  const pool = await getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE sims
       SET ${setClauses.join(", ")}
       WHERE sim_id = $1 AND status != 'deleted'
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return buildResponse(404, { error: "Sim not found" }, origin);
    }

    const updatedSim = result.rows[0];

    // If is_founder was changed, update the legacy's founder_id
    if ("is_founder" in parsed) {
      if (updatedSim.is_founder) {
        await client.query(
          `UPDATE legacies SET founder_id = $1 WHERE legacy_id = $2`,
          [updatedSim.sim_id, updatedSim.legacy_id]
        );
      } else {
        // Unset founder_id only if this sim was the current founder
        await client.query(
          `UPDATE legacies SET founder_id = NULL WHERE legacy_id = $1 AND founder_id = $2`,
          [updatedSim.legacy_id, updatedSim.sim_id]
        );
      }
    }

    await client.query("COMMIT");

    return buildResponse(200, { data: updatedSim }, origin);
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23503") {
      return buildResponse(400, { error: FK_ERROR_MESSAGE }, origin);
    }
    throw error;
  } finally {
    client.release();
  }
};

const deleteSim = async (origin, simId) => {
  if (!isValidUuid(simId)) {
    return buildResponse(400, { error: "Invalid sim_id format" }, origin);
  }

  const pool = await getPool();
  const result = await pool.query(
    `UPDATE sims
     SET status = 'deleted'
     WHERE sim_id = $1 AND status != 'deleted'
     RETURNING sim_id`,
    [simId]
  );

  if (result.rows.length === 0) {
    return buildResponse(404, { error: "Sim not found" }, origin);
  }

  return buildResponse(200, { data: { deleted: true, sim_id: simId } }, origin);
};

module.exports = {
  createSim,
  getSimById,
  getSimsByLegacy,
  updateSim,
  deleteSim,
};
