const { getPool } = require("../db/pool");
const { buildResponse } = require("../utils/response");
const { isValidUuid, isValidDate, parseBody } = require("../utils/validation");

const VALID_TRAIT_SLOTS = ["1", "2", "3", "bonus", "reward"];

const getSimTraits = async (origin, simId) => {
  if (!isValidUuid(simId)) {
    return buildResponse(400, { error: "Invalid sim_id format" }, origin);
  }

  const pool = await getPool();
  const result = await pool.query(
    `SELECT st.sim_id, st.trait_id, st.acquired_date, st.trait_slot,
            t.trait_name, t.trait_type, t.pack_required
     FROM sim_traits st
     JOIN traits t ON st.trait_id = t.trait_id
     WHERE st.sim_id = $1
     ORDER BY t.trait_name ASC`,
    [simId]
  );

  return buildResponse(200, { data: result.rows }, origin);
};

const addSimTrait = async (origin, simId, body) => {
  if (!isValidUuid(simId)) {
    return buildResponse(400, { error: "Invalid sim_id format" }, origin);
  }

  const parsed = parseBody(body);
  if (!parsed) {
    return buildResponse(400, { error: "Invalid or missing JSON body" }, origin);
  }

  const { trait_id, trait_slot, acquired_date } = parsed;

  if (!trait_id || !isValidUuid(trait_id)) {
    return buildResponse(
      400,
      { error: "trait_id is required and must be a valid UUID" },
      origin
    );
  }

  if (trait_slot !== undefined && trait_slot !== null) {
    if (!VALID_TRAIT_SLOTS.includes(String(trait_slot))) {
      return buildResponse(
        400,
        { error: `trait_slot must be one of: ${VALID_TRAIT_SLOTS.join(", ")}` },
        origin
      );
    }
  }

  if (acquired_date !== undefined && acquired_date !== null && !isValidDate(acquired_date)) {
    return buildResponse(400, { error: "acquired_date must be a valid date" }, origin);
  }

  const pool = await getPool();

  try {
    const result = await pool.query(
      `INSERT INTO sim_traits (sim_id, trait_id, trait_slot, acquired_date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        simId,
        trait_id,
        trait_slot ?? "1",
        acquired_date || null,
      ]
    );

    return buildResponse(201, { data: result.rows[0] }, origin);
  } catch (error) {
    if (error.code === "23503") {
      return buildResponse(
        400,
        { error: "Referenced sim or trait does not exist" },
        origin
      );
    }
    if (error.code === "23505") {
      return buildResponse(
        409,
        { error: "This trait is already assigned to this sim" },
        origin
      );
    }
    throw error;
  }
};

const removeSimTrait = async (origin, simId, traitId) => {
  if (!isValidUuid(simId)) {
    return buildResponse(400, { error: "Invalid sim_id format" }, origin);
  }
  if (!isValidUuid(traitId)) {
    return buildResponse(400, { error: "Invalid trait_id format" }, origin);
  }

  const pool = await getPool();
  const result = await pool.query(
    `DELETE FROM sim_traits
     WHERE sim_id = $1 AND trait_id = $2
     RETURNING sim_id, trait_id`,
    [simId, traitId]
  );

  if (result.rows.length === 0) {
    return buildResponse(404, { error: "Sim trait not found" }, origin);
  }

  return buildResponse(200, { data: { deleted: true, ...result.rows[0] } }, origin);
};

module.exports = {
  getSimTraits,
  addSimTrait,
  removeSimTrait,
};
