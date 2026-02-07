const { healthHandler } = require("./handlers/health");
const {
  getSkills,
  getTraits,
  getAspirations,
  getCareers,
  getCareerBranches,
  getWorlds,
} = require("./handlers/reference");
const {
  createLegacy,
  getLegacyById,
  getAllLegacies,
  updateLegacy,
  getLegacyStats,
} = require("./handlers/legacies");
const {
  getGenerationsByLegacy,
  getGenerationById,
  startGeneration,
  completeGeneration,
  getGenerationGoals,
  updateGoalCompletion,
} = require("./handlers/generations");
const {
  getEligibleHeirs,
  selectHeir,
} = require("./handlers/heir-selection");
const {
  getAllGenerationTemplates,
  getGenerationTemplateByNumber,
} = require("./handlers/generation-templates");
const {
  createSim,
  getSimById,
  getSimsByLegacy,
  updateSim,
  deleteSim,
} = require("./handlers/sims");
const {
  getSimTraits,
  addSimTrait,
  removeSimTrait,
} = require("./handlers/sim-traits");
const {
  getSimSkills,
  upsertSimSkill,
  removeSimSkill,
} = require("./handlers/sim-skills");
const {
  getSimAspirations,
  addSimAspiration,
  updateSimAspiration,
  removeSimAspiration,
} = require("./handlers/sim-aspirations");
const {
  getSimCareers,
  addSimCareer,
  updateSimCareer,
  removeSimCareer,
} = require("./handlers/sim-careers");
const { getSimFamilyTree } = require("./handlers/family-tree");
const {
  getSimRelationships,
  addSimRelationship,
  updateSimRelationship,
  removeSimRelationship,
} = require("./handlers/sim-relationships");
const { getCorsHeaders } = require("./middleware/cors");
const { withErrorHandling } = require("./middleware/error-handler");

const UUID_PATTERN =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

const ROUTE_SIMS_COLLECTION = /\/sims\/?$/i;
const ROUTE_SIMS_ID = new RegExp(`\\/sims\\/(${UUID_PATTERN})\\/?$`, "i");
const ROUTE_LEGACY_SIMS = new RegExp(
  `\\/legacies\\/(${UUID_PATTERN})\\/sims\\/?$`,
  "i"
);

// Legacy routes
const ROUTE_LEGACIES_COLLECTION = /\/legacies\/?$/i;
const ROUTE_LEGACY_ID = new RegExp(`\\/legacies\\/(${UUID_PATTERN})\\/?$`, "i");
const ROUTE_LEGACY_GENERATIONS = new RegExp(
  `\\/legacies\\/(${UUID_PATTERN})\\/generations\\/?$`,
  "i"
);
const ROUTE_LEGACY_STATS = new RegExp(
  `\\/legacies\\/(${UUID_PATTERN})\\/stats\\/?$`,
  "i"
);

// Generation routes
const ROUTE_GENERATION_ID = new RegExp(`\\/generations\\/(${UUID_PATTERN})\\/?$`, "i");
const ROUTE_GENERATION_START = new RegExp(
  `\\/generations\\/(${UUID_PATTERN})\\/start\\/?$`,
  "i"
);
const ROUTE_GENERATION_COMPLETE = new RegExp(
  `\\/generations\\/(${UUID_PATTERN})\\/complete\\/?$`,
  "i"
);
const ROUTE_GENERATION_GOALS = new RegExp(
  `\\/generations\\/(${UUID_PATTERN})\\/goals\\/?$`,
  "i"
);
const ROUTE_GENERATION_ELIGIBLE_HEIRS = new RegExp(
  `\\/generations\\/(${UUID_PATTERN})\\/eligible-heirs\\/?$`,
  "i"
);
const ROUTE_GENERATION_HEIR = new RegExp(
  `\\/generations\\/(${UUID_PATTERN})\\/heir\\/?$`,
  "i"
);

// Goal routes
const ROUTE_GOAL_COMPLETE = new RegExp(
  `\\/goals\\/(${UUID_PATTERN})\\/complete\\/?$`,
  "i"
);

// Generation template routes
const ROUTE_GENERATION_TEMPLATES = /\/generation-templates\/?$/i;
const ROUTE_GENERATION_TEMPLATE_NUMBER = /\/generation-templates\/(\d+)\/?$/i;

// Sub-resource ID routes (2 UUIDs) - checked before collection routes
const ROUTE_SIM_RELATIONSHIP_ID = new RegExp(
  `\\/sims\\/(${UUID_PATTERN})\\/relationships\\/(${UUID_PATTERN})\\/?$`,
  "i"
);
const ROUTE_SIM_TRAIT_ID = new RegExp(
  `\\/sims\\/(${UUID_PATTERN})\\/traits\\/(${UUID_PATTERN})\\/?$`,
  "i"
);
const ROUTE_SIM_SKILL_ID = new RegExp(
  `\\/sims\\/(${UUID_PATTERN})\\/skills\\/(${UUID_PATTERN})\\/?$`,
  "i"
);
const ROUTE_SIM_ASPIRATION_ID = new RegExp(
  `\\/sims\\/(${UUID_PATTERN})\\/aspirations\\/(${UUID_PATTERN})\\/?$`,
  "i"
);
const ROUTE_SIM_CAREER_ID = new RegExp(
  `\\/sims\\/(${UUID_PATTERN})\\/careers\\/(${UUID_PATTERN})\\/?$`,
  "i"
);

// Sub-resource collection routes (1 UUID)
const ROUTE_SIM_FAMILY_TREE = new RegExp(
  `\\/sims\\/(${UUID_PATTERN})\\/family-tree\\/?$`,
  "i"
);
const ROUTE_SIM_RELATIONSHIPS = new RegExp(
  `\\/sims\\/(${UUID_PATTERN})\\/relationships\\/?$`,
  "i"
);
const ROUTE_SIM_TRAITS = new RegExp(
  `\\/sims\\/(${UUID_PATTERN})\\/traits\\/?$`,
  "i"
);
const ROUTE_SIM_SKILLS = new RegExp(
  `\\/sims\\/(${UUID_PATTERN})\\/skills\\/?$`,
  "i"
);
const ROUTE_SIM_ASPIRATIONS = new RegExp(
  `\\/sims\\/(${UUID_PATTERN})\\/aspirations\\/?$`,
  "i"
);
const ROUTE_SIM_CAREERS = new RegExp(
  `\\/sims\\/(${UUID_PATTERN})\\/careers\\/?$`,
  "i"
);

const notFound = (origin) => ({
  statusCode: 404,
  headers: {
    "Content-Type": "application/json",
    ...getCorsHeaders(origin),
  },
  body: JSON.stringify({ message: "Not Found" }),
});

const optionsResponse = (origin) => ({
  statusCode: 204,
  headers: {
    ...getCorsHeaders(origin),
  },
  body: "",
});

const parseQueryString = (rawPath) => {
  const qIndex = rawPath.indexOf("?");
  if (qIndex === -1) {
    return {};
  }
  const qs = rawPath.slice(qIndex + 1);
  const params = {};
  for (const pair of qs.split("&")) {
    const [key, value] = pair.split("=");
    if (key) {
      params[decodeURIComponent(key)] = value
        ? decodeURIComponent(value)
        : "";
    }
  }
  return params;
};

const handler = async (event) => {
  const origin = event?.headers?.origin || event?.headers?.Origin || "";

  if (event?.httpMethod === "OPTIONS") {
    return optionsResponse(origin);
  }

  const rawPath = event?.path || "";
  const path = rawPath.split("?")[0];
  const method = event?.httpMethod || "";

  // Health
  if (method === "GET" && path.endsWith("/health")) {
    return healthHandler(origin);
  }

  // Reference data
  if (method === "GET" && path.endsWith("/reference/skills")) {
    return getSkills(origin);
  }

  if (method === "GET" && path.endsWith("/reference/traits")) {
    return getTraits(origin);
  }

  if (method === "GET" && path.endsWith("/reference/aspirations")) {
    return getAspirations(origin);
  }

  if (method === "GET" && path.endsWith("/reference/careers")) {
    return getCareers(origin);
  }

  const careerBranchesMatch = path.match(
    new RegExp(`\\/reference\\/careers\\/(${UUID_PATTERN})\\/branches\\/?$`, "i")
  );
  if (method === "GET" && careerBranchesMatch) {
    return getCareerBranches(origin, careerBranchesMatch[1]);
  }

  if (method === "GET" && path.endsWith("/reference/worlds")) {
    return getWorlds(origin);
  }

  // Legacies CRUD

  // GET /legacies (list all)
  if (method === "GET" && ROUTE_LEGACIES_COLLECTION.test(path)) {
    return getAllLegacies(origin);
  }

  // POST /legacies
  if (method === "POST" && ROUTE_LEGACIES_COLLECTION.test(path)) {
    return createLegacy(origin, event?.body);
  }

  // GET /legacies/:legacyId (must check before sub-resource routes)
  const legacyIdMatch = path.match(ROUTE_LEGACY_ID);

  // GET|PUT /legacies/:legacyId
  if (method === "GET" && legacyIdMatch) {
    return getLegacyById(origin, legacyIdMatch[1]);
  }

  if (method === "PUT" && legacyIdMatch) {
    return updateLegacy(origin, legacyIdMatch[1], event?.body);
  }

  // Legacy sub-resources

  // GET /legacies/:legacyId/generations
  const legacyGenerationsMatch = path.match(ROUTE_LEGACY_GENERATIONS);
  if (method === "GET" && legacyGenerationsMatch) {
    return getGenerationsByLegacy(origin, legacyGenerationsMatch[1]);
  }

  // GET /legacies/:legacyId/stats
  const legacyStatsMatch = path.match(ROUTE_LEGACY_STATS);
  if (method === "GET" && legacyStatsMatch) {
    return getLegacyStats(origin, legacyStatsMatch[1]);
  }

  // Generations

  // Generation action routes (more specific, check first)
  const genStartMatch = path.match(ROUTE_GENERATION_START);
  if (method === "POST" && genStartMatch) {
    return startGeneration(origin, genStartMatch[1], event?.body);
  }

  const genCompleteMatch = path.match(ROUTE_GENERATION_COMPLETE);
  if (method === "PUT" && genCompleteMatch) {
    return completeGeneration(origin, genCompleteMatch[1], event?.body);
  }

  const genGoalsMatch = path.match(ROUTE_GENERATION_GOALS);
  if (method === "GET" && genGoalsMatch) {
    return getGenerationGoals(origin, genGoalsMatch[1]);
  }

  const genEligibleHeirsMatch = path.match(ROUTE_GENERATION_ELIGIBLE_HEIRS);
  if (method === "GET" && genEligibleHeirsMatch) {
    return getEligibleHeirs(origin, genEligibleHeirsMatch[1]);
  }

  const genHeirMatch = path.match(ROUTE_GENERATION_HEIR);
  if (method === "PUT" && genHeirMatch) {
    return selectHeir(origin, genHeirMatch[1], event?.body);
  }

  // GET /generations/:generationId
  const generationIdMatch = path.match(ROUTE_GENERATION_ID);
  if (method === "GET" && generationIdMatch) {
    return getGenerationById(origin, generationIdMatch[1]);
  }

  // Goals

  // PUT /goals/:goalId/complete
  const goalCompleteMatch = path.match(ROUTE_GOAL_COMPLETE);
  if (method === "PUT" && goalCompleteMatch) {
    return updateGoalCompletion(origin, goalCompleteMatch[1], event?.body);
  }

  // Generation Templates

  // GET /generation-templates
  if (method === "GET" && ROUTE_GENERATION_TEMPLATES.test(path)) {
    return getAllGenerationTemplates(origin);
  }

  // GET /generation-templates/:number
  const genTemplateMatch = path.match(ROUTE_GENERATION_TEMPLATE_NUMBER);
  if (method === "GET" && genTemplateMatch) {
    return getGenerationTemplateByNumber(origin, genTemplateMatch[1]);
  }

  // Sims CRUD

  // POST /sims
  if (method === "POST" && ROUTE_SIMS_COLLECTION.test(path)) {
    return createSim(origin, event?.body);
  }

  // GET /legacies/:legacyId/sims (checked before /sims/:id to avoid collision)
  const legacySimsMatch = path.match(ROUTE_LEGACY_SIMS);
  if (method === "GET" && legacySimsMatch) {
    const queryParams =
      event?.queryStringParameters || parseQueryString(rawPath);
    return getSimsByLegacy(origin, legacySimsMatch[1], queryParams);
  }

  // --- Sim sub-resource ID routes (2 UUIDs) checked first ---

  // PUT|DELETE /sims/:simId/relationships/:relationshipId
  const simRelationshipIdMatch = path.match(ROUTE_SIM_RELATIONSHIP_ID);
  if (method === "PUT" && simRelationshipIdMatch) {
    return updateSimRelationship(
      origin,
      simRelationshipIdMatch[1],
      simRelationshipIdMatch[2],
      event?.body
    );
  }
  if (method === "DELETE" && simRelationshipIdMatch) {
    return removeSimRelationship(
      origin,
      simRelationshipIdMatch[1],
      simRelationshipIdMatch[2]
    );
  }

  // DELETE /sims/:simId/traits/:traitId
  const simTraitIdMatch = path.match(ROUTE_SIM_TRAIT_ID);
  if (method === "DELETE" && simTraitIdMatch) {
    return removeSimTrait(origin, simTraitIdMatch[1], simTraitIdMatch[2]);
  }

  // DELETE /sims/:simId/skills/:skillId
  const simSkillIdMatch = path.match(ROUTE_SIM_SKILL_ID);
  if (method === "DELETE" && simSkillIdMatch) {
    return removeSimSkill(origin, simSkillIdMatch[1], simSkillIdMatch[2]);
  }

  // PUT|DELETE /sims/:simId/aspirations/:aspirationId
  const simAspirationIdMatch = path.match(ROUTE_SIM_ASPIRATION_ID);
  if (method === "PUT" && simAspirationIdMatch) {
    return updateSimAspiration(
      origin,
      simAspirationIdMatch[1],
      simAspirationIdMatch[2],
      event?.body
    );
  }
  if (method === "DELETE" && simAspirationIdMatch) {
    return removeSimAspiration(
      origin,
      simAspirationIdMatch[1],
      simAspirationIdMatch[2]
    );
  }

  // PUT|DELETE /sims/:simId/careers/:simCareerId
  const simCareerIdMatch = path.match(ROUTE_SIM_CAREER_ID);
  if (method === "PUT" && simCareerIdMatch) {
    return updateSimCareer(
      origin,
      simCareerIdMatch[1],
      simCareerIdMatch[2],
      event?.body
    );
  }
  if (method === "DELETE" && simCareerIdMatch) {
    return removeSimCareer(origin, simCareerIdMatch[1], simCareerIdMatch[2]);
  }

  // --- Sim sub-resource collection routes (1 UUID) ---

  // GET /sims/:simId/family-tree
  const simFamilyTreeMatch = path.match(ROUTE_SIM_FAMILY_TREE);
  if (method === "GET" && simFamilyTreeMatch) {
    return getSimFamilyTree(origin, simFamilyTreeMatch[1]);
  }

  // GET|POST /sims/:simId/relationships
  const simRelationshipsMatch = path.match(ROUTE_SIM_RELATIONSHIPS);
  if (method === "GET" && simRelationshipsMatch) {
    return getSimRelationships(origin, simRelationshipsMatch[1]);
  }
  if (method === "POST" && simRelationshipsMatch) {
    return addSimRelationship(origin, simRelationshipsMatch[1], event?.body);
  }

  // GET|POST /sims/:simId/traits
  const simTraitsMatch = path.match(ROUTE_SIM_TRAITS);
  if (method === "GET" && simTraitsMatch) {
    return getSimTraits(origin, simTraitsMatch[1]);
  }
  if (method === "POST" && simTraitsMatch) {
    return addSimTrait(origin, simTraitsMatch[1], event?.body);
  }

  // GET|POST /sims/:simId/skills
  const simSkillsMatch = path.match(ROUTE_SIM_SKILLS);
  if (method === "GET" && simSkillsMatch) {
    return getSimSkills(origin, simSkillsMatch[1]);
  }
  if (method === "POST" && simSkillsMatch) {
    return upsertSimSkill(origin, simSkillsMatch[1], event?.body);
  }

  // GET|POST /sims/:simId/aspirations
  const simAspirationsMatch = path.match(ROUTE_SIM_ASPIRATIONS);
  if (method === "GET" && simAspirationsMatch) {
    return getSimAspirations(origin, simAspirationsMatch[1]);
  }
  if (method === "POST" && simAspirationsMatch) {
    return addSimAspiration(origin, simAspirationsMatch[1], event?.body);
  }

  // GET|POST /sims/:simId/careers
  const simCareersMatch = path.match(ROUTE_SIM_CAREERS);
  if (method === "GET" && simCareersMatch) {
    return getSimCareers(origin, simCareersMatch[1]);
  }
  if (method === "POST" && simCareersMatch) {
    return addSimCareer(origin, simCareersMatch[1], event?.body);
  }

  // --- Sims by ID (after sub-resource routes to avoid collision) ---

  // GET /sims/:simId
  const simIdMatch = path.match(ROUTE_SIMS_ID);

  if (method === "GET" && simIdMatch) {
    return getSimById(origin, simIdMatch[1]);
  }

  // PUT /sims/:simId
  if (method === "PUT" && simIdMatch) {
    return updateSim(origin, simIdMatch[1], event?.body);
  }

  // DELETE /sims/:simId
  if (method === "DELETE" && simIdMatch) {
    return deleteSim(origin, simIdMatch[1]);
  }

  return notFound(origin);
};

module.exports = {
  handler: withErrorHandling(handler),
};
