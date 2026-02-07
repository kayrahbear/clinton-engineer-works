const { getPool } = require("../db/pool");
const { buildResponse } = require("../utils/response");
const { isValidUuid } = require("../utils/validation");

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

const getMilestones = async (origin) => {
  const rows = await fetchRows(
    `SELECT milestone_id, milestone_name, description, category, min_age_group, max_age_group, pack_required, icon_path
     FROM milestones
     ORDER BY milestone_name ASC`
  );

  return buildResponse(200, { data: rows }, origin);
};

const VALID_AGE_GROUPS = ["infant", "toddler", "child", "teen", "young_adult", "adult", "elder"];

const getMilestonesByAge = async (origin, lifeStage) => {
  if (!VALID_AGE_GROUPS.includes(lifeStage)) {
    return buildResponse(
      400,
      { error: `lifeStage must be one of: ${VALID_AGE_GROUPS.join(", ")}` },
      origin
    );
  }

  const rows = await fetchRows(
    `SELECT milestone_id, milestone_name, description, category, min_age_group, max_age_group, pack_required, icon_path
     FROM milestones
     WHERE
       CASE min_age_group
         WHEN 'infant' THEN 1
         WHEN 'toddler' THEN 2
         WHEN 'child' THEN 3
         WHEN 'teen' THEN 4
         WHEN 'young_adult' THEN 5
         WHEN 'adult' THEN 6
         WHEN 'elder' THEN 7
       END
       <=
       CASE $1
         WHEN 'infant' THEN 1
         WHEN 'toddler' THEN 2
         WHEN 'child' THEN 3
         WHEN 'teen' THEN 4
         WHEN 'young_adult' THEN 5
         WHEN 'adult' THEN 6
         WHEN 'elder' THEN 7
       END
       AND (
         max_age_group IS NULL OR
         CASE max_age_group
           WHEN 'infant' THEN 1
           WHEN 'toddler' THEN 2
           WHEN 'child' THEN 3
           WHEN 'teen' THEN 4
           WHEN 'young_adult' THEN 5
           WHEN 'adult' THEN 6
           WHEN 'elder' THEN 7
         END
         >=
         CASE $1
           WHEN 'infant' THEN 1
           WHEN 'toddler' THEN 2
           WHEN 'child' THEN 3
           WHEN 'teen' THEN 4
           WHEN 'young_adult' THEN 5
           WHEN 'adult' THEN 6
           WHEN 'elder' THEN 7
         END
       )
     ORDER BY milestone_name ASC`,
    [lifeStage]
  );

  return buildResponse(200, { data: rows }, origin);
};

const getCareerBranches = async (origin, careerId) => {
  if (!isValidUuid(careerId)) {
    return buildResponse(400, { error: "Invalid career_id format" }, origin);
  }

  const rows = await fetchRows(
    `SELECT branch_id, career_id, branch_name, levels_in_branch
     FROM career_branches
     WHERE career_id = $1
     ORDER BY branch_name ASC`,
    [careerId]
  );

  return buildResponse(200, { data: rows }, origin);
};

module.exports = {
  getSkills,
  getTraits,
  getAspirations,
  getCareers,
  getCareerBranches,
  getWorlds,
  getMilestones,
  getMilestonesByAge,
};
