const { getPool } = require("../db/pool");
const { buildResponse } = require("../utils/response");
const { isValidUuid, parseBody } = require("../utils/validation");
const { verifyGenerationOwnership } = require("../utils/authorization");

/**
 * Evaluate a sim's eligibility against gender law.
 * Returns { eligible: boolean, note: string }
 */
function evaluateGenderLaw(sim, genderLaw, allCandidates) {
  const gender = (sim.gender || "").toLowerCase();

  switch (genderLaw) {
    case "equality":
    case "strict_equality":
      return { eligible: true, note: "All genders eligible (Equality)" };

    case "strict_matriarchy":
      return gender === "female"
        ? { eligible: true, note: "Female sim meets Strict Matriarchy" }
        : { eligible: false, note: "Only female sims eligible (Strict Matriarchy)" };

    case "matriarchy": {
      if (gender === "female") {
        return { eligible: true, note: "Female sim meets Matriarchy" };
      }
      const hasFemale = allCandidates.some(
        (c) => (c.gender || "").toLowerCase() === "female"
      );
      return hasFemale
        ? { eligible: false, note: "Female sims available; males ineligible (Matriarchy)" }
        : { eligible: true, note: "No female sims available; male eligible as fallback (Matriarchy)" };
    }

    case "strict_patriarchy":
      return gender === "male"
        ? { eligible: true, note: "Male sim meets Strict Patriarchy" }
        : { eligible: false, note: "Only male sims eligible (Strict Patriarchy)" };

    case "patriarchy": {
      if (gender === "male") {
        return { eligible: true, note: "Male sim meets Patriarchy" };
      }
      const hasMale = allCandidates.some(
        (c) => (c.gender || "").toLowerCase() === "male"
      );
      return hasMale
        ? { eligible: false, note: "Male sims available; females ineligible (Patriarchy)" }
        : { eligible: true, note: "No male sims available; female eligible as fallback (Patriarchy)" };
    }

    default:
      return { eligible: true, note: "Gender law not restricted" };
  }
}

/**
 * Evaluate a sim's eligibility against bloodline law.
 * Returns { eligible: boolean, note: string }
 */
function evaluateBloodlineLaw(sim, bloodlineLaw, allCandidates) {
  const hasBiologicalParent = sim.mother_id || sim.father_id;

  switch (bloodlineLaw) {
    case "traditional":
    case "modern":
      return { eligible: true, note: "All children eligible (Traditional/Modern)" };

    case "strict_traditional":
      return hasBiologicalParent
        ? { eligible: true, note: "Biological child meets Strict Traditional" }
        : { eligible: false, note: "Only biological children eligible (Strict Traditional)" };

    case "strict_foster":
      return !hasBiologicalParent
        ? { eligible: true, note: "Adopted child meets Strict Foster" }
        : { eligible: false, note: "Only adopted children eligible (Strict Foster)" };

    case "foster": {
      if (!hasBiologicalParent) {
        return { eligible: true, note: "Adopted child meets Foster" };
      }
      const hasAdopted = allCandidates.some((c) => !c.mother_id && !c.father_id);
      return hasAdopted
        ? { eligible: false, note: "Adopted children available; biological ineligible (Foster)" }
        : { eligible: true, note: "No adopted children available; biological eligible as fallback (Foster)" };
    }

    default:
      return { eligible: true, note: "Bloodline law not restricted" };
  }
}

/**
 * Evaluate a sim's eligibility against species law.
 * Returns { eligible: boolean, note: string }
 */
function evaluateSpeciesLaw(sim, speciesLaw, allCandidates) {
  const occult = (sim.occult_type || "human").toLowerCase();
  const isHuman = occult === "human";

  switch (speciesLaw) {
    case "tolerant":
    case "brood":
      return { eligible: true, note: "All species eligible (Tolerant/Brood)" };

    case "xenophobic":
      return isHuman
        ? { eligible: true, note: "Human sim meets Xenophobic" }
        : { eligible: false, note: "Only human sims eligible (Xenophobic)" };

    case "xenoarchy": {
      if (!isHuman) {
        return { eligible: true, note: "Occult sim meets Xenoarchy" };
      }
      const hasOccult = allCandidates.some(
        (c) => (c.occult_type || "human").toLowerCase() !== "human"
      );
      return hasOccult
        ? { eligible: false, note: "Occult sims available; humans ineligible (Xenoarchy)" }
        : { eligible: true, note: "No occult sims available; human eligible as fallback (Xenoarchy)" };
    }

    default:
      return { eligible: true, note: "Species law not restricted" };
  }
}

/**
 * Sort candidates based on heir law and return recommended heir ID.
 */
function sortByHeirLaw(candidates, heirLaw) {
  const eligible = candidates.filter((c) => c.is_eligible);
  if (eligible.length === 0) return { sorted: candidates, recommended: null };

  let sorted;

  switch (heirLaw) {
    case "first_born":
      sorted = [...eligible].sort((a, b) => {
        if (!a.birth_date && !b.birth_date) return 0;
        if (!a.birth_date) return 1;
        if (!b.birth_date) return -1;
        return new Date(a.birth_date) - new Date(b.birth_date);
      });
      break;

    case "last_born":
      sorted = [...eligible].sort((a, b) => {
        if (!a.birth_date && !b.birth_date) return 0;
        if (!a.birth_date) return 1;
        if (!b.birth_date) return -1;
        return new Date(b.birth_date) - new Date(a.birth_date);
      });
      break;

    case "random":
      sorted = [...eligible].sort(() => Math.random() - 0.5);
      break;

    case "magical_bloodline":
    case "magical_strength":
      sorted = [...eligible].sort((a, b) => {
        const aOccult = (a.occult_type || "human").toLowerCase() !== "human" ? 0 : 1;
        const bOccult = (b.occult_type || "human").toLowerCase() !== "human" ? 0 : 1;
        return aOccult - bOccult;
      });
      break;

    default:
      // living_will, democracy, merit, strength, exemplar — user picks
      sorted = [...eligible];
      break;
  }

  const ineligible = candidates.filter((c) => !c.is_eligible);
  const recommended = sorted.length > 0 ? sorted[0].sim_id : null;

  return { sorted: [...sorted, ...ineligible], recommended };
}

/**
 * GET /api/generations/:generationId/eligible-heirs
 * Returns candidate sims with eligibility evaluation based on succession laws.
 */
const getEligibleHeirs = async (origin, userId, generationId) => {
  if (!isValidUuid(generationId)) {
    return buildResponse(400, { error: "Invalid generation_id format" }, origin);
  }

  if (!(await verifyGenerationOwnership(generationId, userId))) {
    return buildResponse(404, { error: "Generation not found" }, origin);
  }

  const pool = await getPool();

  // Get generation + legacy succession laws + founder info
  const genResult = await pool.query(
    `SELECT g.generation_id, g.legacy_id, g.generation_number, g.heir_id,
            g.founder_id, f.name AS founder_name,
            l.gender_law, l.bloodline_law, l.heir_law, l.species_law
     FROM generations g
     JOIN legacies l ON g.legacy_id = l.legacy_id
     LEFT JOIN sims f ON g.founder_id = f.sim_id
     WHERE g.generation_id = $1
       AND l.legacy_name != 'Pack Legacy Challenge Template'`,
    [generationId]
  );

  if (genResult.rows.length === 0) {
    return buildResponse(404, { error: "Generation not found" }, origin);
  }

  const generation = genResult.rows[0];

  // Get candidate sims: children of the founder, or fall back to all sims in this generation
  let simsResult;
  if (generation.founder_id) {
    simsResult = await pool.query(
      `SELECT s.sim_id, s.name, s.gender, s.life_stage, s.occult_type,
              s.birth_date, s.is_generation_heir, s.mother_id, s.father_id, s.status
       FROM sims s
       WHERE (s.mother_id = $1 OR s.father_id = $1)
         AND s.status != 'deleted'
       ORDER BY s.birth_date ASC NULLS LAST, s.created_at ASC`,
      [generation.founder_id]
    );
  } else {
    // Fallback: no founder set, show all sims in this generation
    simsResult = await pool.query(
      `SELECT s.sim_id, s.name, s.gender, s.life_stage, s.occult_type,
              s.birth_date, s.is_generation_heir, s.mother_id, s.father_id, s.status
       FROM sims s
       WHERE s.generation_id = $1
         AND s.status != 'deleted'
       ORDER BY s.birth_date ASC NULLS LAST, s.created_at ASC`,
      [generationId]
    );
  }

  const rawCandidates = simsResult.rows;

  // Evaluate each candidate against succession laws
  const candidates = rawCandidates.map((sim) => {
    const genderEval = evaluateGenderLaw(sim, generation.gender_law, rawCandidates);
    const bloodlineEval = evaluateBloodlineLaw(sim, generation.bloodline_law, rawCandidates);
    const speciesEval = evaluateSpeciesLaw(sim, generation.species_law, rawCandidates);

    const isEligible = genderEval.eligible && bloodlineEval.eligible && speciesEval.eligible;

    const eligibilityNotes = [];
    const ineligibilityReasons = [];

    for (const eval_ of [genderEval, bloodlineEval, speciesEval]) {
      if (eval_.eligible) {
        eligibilityNotes.push(eval_.note);
      } else {
        ineligibilityReasons.push(eval_.note);
      }
    }

    return {
      sim_id: sim.sim_id,
      name: sim.name,
      gender: sim.gender,
      life_stage: sim.life_stage,
      occult_type: sim.occult_type,
      birth_date: sim.birth_date,
      is_generation_heir: sim.is_generation_heir,
      status: sim.status,
      mother_id: sim.mother_id,
      father_id: sim.father_id,
      is_eligible: isEligible,
      eligibility_notes: eligibilityNotes,
      ineligibility_reasons: ineligibilityReasons,
    };
  });

  // Sort by heir law and determine recommended heir
  const { sorted, recommended } = sortByHeirLaw(candidates, generation.heir_law);

  return buildResponse(
    200,
    {
      data: {
        candidates: sorted,
        succession_laws: {
          gender_law: generation.gender_law,
          bloodline_law: generation.bloodline_law,
          heir_law: generation.heir_law,
          species_law: generation.species_law,
        },
        founder_id: generation.founder_id,
        founder_name: generation.founder_name,
        current_heir_id: generation.heir_id,
        recommended_heir_id: recommended,
      },
    },
    origin
  );
};

/**
 * PUT /api/generations/:generationId/heir
 * Select an heir for a generation.
 */
const selectHeir = async (origin, userId, generationId, body) => {
  if (!isValidUuid(generationId)) {
    return buildResponse(400, { error: "Invalid generation_id format" }, origin);
  }

  if (!(await verifyGenerationOwnership(generationId, userId))) {
    return buildResponse(404, { error: "Generation not found" }, origin);
  }

  const parsed = parseBody(body);
  if (!parsed || !parsed.heir_id) {
    return buildResponse(400, { error: "heir_id is required" }, origin);
  }

  const { heir_id } = parsed;
  if (!isValidUuid(heir_id)) {
    return buildResponse(400, { error: "heir_id must be a valid UUID" }, origin);
  }

  const pool = await getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verify generation exists
    const genResult = await client.query(
      `SELECT g.generation_id, g.legacy_id, g.heir_id AS old_heir_id
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

    // Verify the heir sim exists and belongs to this legacy
    const simCheck = await client.query(
      `SELECT sim_id FROM sims
       WHERE sim_id = $1 AND legacy_id = $2 AND status != 'deleted'`,
      [heir_id, generation.legacy_id]
    );

    if (simCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return buildResponse(
        400,
        { error: "Sim not found in this legacy or has been deleted" },
        origin
      );
    }

    // Clear previous heir for this generation (if any)
    if (generation.old_heir_id) {
      await client.query(
        `UPDATE sims SET is_generation_heir = FALSE WHERE sim_id = $1`,
        [generation.old_heir_id]
      );
    }

    // Set new heir on generation
    const updateResult = await client.query(
      `UPDATE generations SET heir_id = $2 WHERE generation_id = $1 RETURNING *`,
      [generationId, heir_id]
    );

    // Mark sim as heir
    await client.query(
      `UPDATE sims SET is_generation_heir = TRUE WHERE sim_id = $1`,
      [heir_id]
    );

    await client.query("COMMIT");

    // Fetch updated generation with founder and heir names
    const refreshed = await pool.query(
      `SELECT g.*,
              f.name AS founder_name, f.sim_id AS founder_sim_id,
              s.name AS heir_name, s.sim_id AS heir_sim_id
       FROM generations g
       LEFT JOIN sims f ON g.founder_id = f.sim_id
       LEFT JOIN sims s ON g.heir_id = s.sim_id
       WHERE g.generation_id = $1`,
      [generationId]
    );

    return buildResponse(200, { data: refreshed.rows[0] }, origin);
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23503") {
      return buildResponse(400, { error: "Referenced sim does not exist" }, origin);
    }
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getEligibleHeirs,
  selectHeir,
};
