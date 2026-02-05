const { getPool } = require("../db/pool");
const { buildResponse } = require("../utils/response");

const fetchRows = async (query, params = []) => {
  const pool = await getPool();
  const result = await pool.query(query, params);
  return result.rows;
};

const getSkills = async (origin) => {
  const rows = await fetchRows(
    `SELECT skill_id, skill_name, max_level, ideal_mood, toddler_only, child_only, pack_required
     FROM skills
     ORDER BY skill_name ASC`
  );

  return buildResponse(200, { data: rows }, origin);
};

const getTraits = async (origin) => {
  const rows = await fetchRows(
    `SELECT trait_id, trait_name, trait_type, related_aspiration_id, price, infant_only,
            toddler_only, child_only, pack_required
     FROM traits
     ORDER BY trait_name ASC`
  );

  return buildResponse(200, { data: rows }, origin);
};

const getAspirations = async (origin) => {
  const rows = await fetchRows(
    `SELECT aspiration_id, aspiration_name, category, pack_required,
            child_only, description
     FROM aspirations
     ORDER BY aspiration_name ASC`
  );

  return buildResponse(200, { data: rows }, origin);
};

const getCareers = async (origin) => {
  const rows = await fetchRows(
    `SELECT career_id, career_name, max_level, has_branches, career_type,
            teen_eligible, university_only, pack_required
     FROM careers
     ORDER BY career_name ASC`
  );

  return buildResponse(200, { data: rows }, origin);
};

const getWorlds = async (origin) => {
  const rows = await fetchRows(
    `SELECT world_id, world_name, world_type, pack_required
     FROM worlds
     ORDER BY world_name ASC`
  );

  return buildResponse(200, { data: rows }, origin);
};

module.exports = {
  getSkills,
  getTraits,
  getAspirations,
  getCareers,
  getWorlds,
};