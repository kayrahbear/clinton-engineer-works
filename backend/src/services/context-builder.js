const { getPool } = require("../db/pool");

const SYSTEM_PROMPT =
  "You are the Sims Legacy Assistant. Be concise and helpful. " +
  "Only use the provided legacy context. If data is missing, ask a clarifying question.";

const buildContextText = (context) => {
  if (!context) {
    return "";
  }

  const lines = [];
  const legacy = context.legacy || {};

  if (legacy.name) {
    lines.push(
      `Legacy: ${legacy.name} (current generation ${legacy.current_generation || "unknown"})`
    );
  }

  const active = context.active_generation;
  if (active) {
    lines.push(
      `Active generation: ${active.generation_number}` +
        (active.pack_name ? `, pack: ${active.pack_name}` : "")
    );
    if (active.backstory) {
      lines.push(`Backstory: ${active.backstory}`);
    }
  }

  const household = context.household || [];
  if (household.length === 0) {
    lines.push("Current household: none recorded.");
  } else {
    lines.push("Current household:");
    for (const sim of household) {
      lines.push(`- ${sim.name} (${sim.life_stage}, ${sim.occult_type})`);
    }
  }

  return lines.join("\n");
};

const buildLegacyContext = async (legacyId, userId) => {
  const pool = await getPool();

  const legacyResult = await pool.query(
    `SELECT legacy_id, legacy_name, current_generation
     FROM legacies
     WHERE legacy_id = $1 AND user_id = $2`,
    [legacyId, userId]
  );

  if (legacyResult.rows.length === 0) {
    return null;
  }

  const legacy = legacyResult.rows[0];

  const activeGenResult = await pool.query(
    `SELECT generation_id, generation_number, pack_name, backstory
     FROM generations
     WHERE legacy_id = $1 AND is_active = TRUE
     ORDER BY generation_number DESC
     LIMIT 1`,
    [legacyId]
  );

  const activeGeneration = activeGenResult.rows[0] || null;

  const householdResult = await pool.query(
    `SELECT sim_id, name, life_stage, occult_type
     FROM sims
     WHERE legacy_id = $1 AND current_household = TRUE AND status = 'alive'
     ORDER BY name`,
    [legacyId]
  );

  const context = {
    legacy: {
      id: legacy.legacy_id,
      name: legacy.legacy_name,
      current_generation: legacy.current_generation,
    },
    active_generation: activeGeneration,
    household: householdResult.rows,
  };

  return {
    systemPrompt: SYSTEM_PROMPT,
    context,
    contextText: buildContextText(context),
  };
};

module.exports = {
  SYSTEM_PROMPT,
  buildLegacyContext,
};
