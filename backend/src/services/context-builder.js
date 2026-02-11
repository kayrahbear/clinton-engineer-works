const { getPool } = require("../db/pool");
const fs = require("fs");
const path = require("path");

const SYSTEM_PROMPT =
  "You are the Sims Legacy Assistant — a helpful, enthusiastic companion for " +
  "tracking Sims 4 Legacy Challenge playthroughs.\n\n" +
  "**Your capabilities:**\n" +
  "1. Answer questions about the legacy, sims, generations, and goals\n" +
  "2. Generate creative stories and narrative summaries\n" +
  "3. Suggest gameplay ideas and next steps\n" +
  "4. **Automatically update sim data** when the user describes gameplay events\n\n" +
  "**Tool use instructions:**\n" +
  "- When the user describes gameplay events (promotions, skill gains, births, " +
  "aspiration completions, trait acquisitions, marriages, etc.), USE YOUR TOOLS to update the data.\n" +
  "- Always confirm what you updated after using tools.\n" +
  "- Keep responses concise: 1-3 sentences, no bullet lists unless the user asks.\n" +
  "- After tool use, respond with a single confirmation sentence and one short follow-up question.\n" +
  "- If you are unsure which sim they are referring to, ask for clarification before updating.\n" +
  "- Use get_sim_details or get_generation_progress to check current state when needed.\n" +
  "- Be conversational, friendly, and celebrate achievements!\n" +
  "- Only use the provided legacy context. If data is missing, ask a clarifying question.\n\n" +
  "**Example:**\n" +
  'User: "Lavender was promoted twice today and finally maxed her cooking skill!"\n' +
  "You: Use update_sim_career (promotions: 2) and update_sim_skill (Cooking, level 10)\n" +
  'Then respond: "Amazing! I\'ve updated Lavender — she\'s now career level X and has maxed Cooking! ' +
  'She\'s crushing it this generation!"';

let packLegacyRulesCache = null;

const loadPackLegacyRules = () => {
  if (packLegacyRulesCache) {
    return packLegacyRulesCache;
  }

  const dataPath = path.resolve(
    __dirname,
    "..",
    "..",
    "..",
    "database",
    "seed-data",
    "pack_legacy_generations.json"
  );

  try {
    const raw = fs.readFileSync(dataPath, "utf8");
    packLegacyRulesCache = JSON.parse(raw);
  } catch (error) {
    console.warn("Failed to load Pack Legacy Challenge rules:", error.message);
    packLegacyRulesCache = [];
  }

  return packLegacyRulesCache;
};

const getPackLegacyRulesForGeneration = (generationNumber) => {
  if (!generationNumber) return null;
  const rules = loadPackLegacyRules();
  return rules.find((entry) => entry.generation_number === generationNumber) || null;
};

const summarizeGoals = (goals = []) => {
  if (goals.length === 0) {
    return "No goals recorded for this generation.";
  }
  const required = goals.filter((goal) => !goal.is_optional);
  const optional = goals.filter((goal) => goal.is_optional);
  const completed = goals.filter((goal) => goal.is_completed).length;
  const total = goals.length;
  const lines = [
    `Goals: ${completed}/${total} completed (${required.length} required, ${optional.length} optional).`,
  ];
  for (const goal of goals.slice(0, 8)) {
    lines.push(
      `- ${goal.is_completed ? "[x]" : "[ ]"} ${goal.goal_text}${
        goal.is_optional ? " (optional)" : ""
      }`
    );
  }
  if (goals.length > 8) {
    lines.push(`- ...and ${goals.length - 8} more goals.`);
  }
  return lines.join("\n");
};

const summarizeRequirements = (traits = [], careers = []) => {
  const lines = [];
  if (traits.length > 0) {
    lines.push(`Required traits: ${traits.map((t) => t.trait_name).join(", ")}.`);
  }
  if (careers.length > 0) {
    const careerLines = careers.map((career) => {
      if (career.branch_name) {
        return `${career.career_name} (${career.branch_name})`;
      }
      return career.career_name;
    });
    lines.push(`Required careers: ${careerLines.join(", ")}.`);
  }
  return lines.join("\n");
};

const summarizeMilestones = (summary, recent, scopeLabel) => {
  if (!summary || summary.total === 0) {
    return `No milestones recorded yet${scopeLabel ? ` (${scopeLabel})` : ""}.`;
  }

  const lines = [
    `Milestones achieved${scopeLabel ? ` (${scopeLabel})` : ""}: ${summary.total}.`,
  ];
  if (summary.byCategory.length > 0) {
    const categoryLine = summary.byCategory
      .map((row) => `${row.category}: ${row.count}`)
      .join(", ");
    lines.push(`By category: ${categoryLine}.`);
  }
  if (recent.length > 0) {
    lines.push("Recent milestones:");
    for (const milestone of recent) {
      let date = "";
      if (milestone.achieved_date) {
        const dateValue =
          milestone.achieved_date instanceof Date
            ? milestone.achieved_date
            : new Date(milestone.achieved_date);
        if (!Number.isNaN(dateValue.getTime())) {
          date = ` (${dateValue.toISOString().slice(0, 10)})`;
        }
      }
      lines.push(
        `- ${milestone.sim_name}: ${milestone.milestone_name} [${milestone.category}]${date}`
      );
    }
  }
  return lines.join("\n");
};

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

    if (active.requirementsSummary) {
      lines.push(active.requirementsSummary);
    }

    if (active.goalsSummary) {
      lines.push(active.goalsSummary);
    }

    if (active.packLegacySummary) {
      lines.push(active.packLegacySummary);
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

  if (context.milestonesSummary) {
    lines.push(context.milestonesSummary);
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

  let goals = [];
  let requiredTraits = [];
  let requiredCareers = [];

  if (activeGeneration) {
    const goalsResult = await pool.query(
      `SELECT goal_text, is_optional, is_completed
       FROM generation_goals
       WHERE generation_id = $1
       ORDER BY is_optional ASC, goal_text ASC`,
      [activeGeneration.generation_id]
    );
    goals = goalsResult.rows;

    const traitsResult = await pool.query(
      `SELECT t.trait_name, grt.trait_order
       FROM generation_required_traits grt
       JOIN traits t ON grt.trait_id = t.trait_id
       WHERE grt.generation_id = $1
       ORDER BY grt.trait_order ASC`,
      [activeGeneration.generation_id]
    );
    requiredTraits = traitsResult.rows;

    const careersResult = await pool.query(
      `SELECT c.career_name, cb.branch_name
       FROM generation_required_careers grc
       JOIN careers c ON grc.career_id = c.career_id
       LEFT JOIN career_branches cb ON grc.branch_id = cb.branch_id
       WHERE grc.generation_id = $1`,
      [activeGeneration.generation_id]
    );
    requiredCareers = careersResult.rows;
  }

  const householdResult = await pool.query(
    `SELECT sim_id, name, life_stage, occult_type
     FROM sims
     WHERE legacy_id = $1 AND current_household = TRUE AND status = 'alive'
     ORDER BY name`,
    [legacyId]
  );

  const milestoneSummaryResult = await pool.query(
    `SELECT m.category, COUNT(*)::int AS count
     FROM sim_milestones sm
     JOIN sims s ON sm.sim_id = s.sim_id
     JOIN milestones m ON sm.milestone_id = m.milestone_id
     WHERE s.legacy_id = $1 AND s.current_household = TRUE
     GROUP BY m.category
     ORDER BY count DESC`,
    [legacyId]
  );

  const milestoneTotal = milestoneSummaryResult.rows.reduce(
    (sum, row) => sum + row.count,
    0
  );

  const recentMilestonesResult = await pool.query(
    `SELECT s.name AS sim_name,
            m.milestone_name,
            m.category,
            sm.achieved_date
     FROM sim_milestones sm
     JOIN sims s ON sm.sim_id = s.sim_id
     JOIN milestones m ON sm.milestone_id = m.milestone_id
     WHERE s.legacy_id = $1 AND s.current_household = TRUE
     ORDER BY sm.achieved_date DESC NULLS LAST, sm.created_at DESC
     LIMIT 8`,
    [legacyId]
  );

  let packLegacySummary = "";
  if (activeGeneration?.generation_number) {
    const packRules = getPackLegacyRulesForGeneration(
      activeGeneration.generation_number
    );
    if (packRules) {
      const requiredExamples = (packRules.required_goals || [])
        .slice(0, 2)
        .map((goal) => goal.goal_text);
      const optionalExamples = (packRules.optional_goals || [])
        .slice(0, 2)
        .map((goal) => goal.goal_text);
      const goalsCount =
        (packRules.required_goals?.length || 0) +
        (packRules.optional_goals?.length || 0);
      packLegacySummary =
        `Pack Legacy rules (gen ${packRules.generation_number} - ${packRules.pack_name}): ` +
        `${goalsCount} goals, ` +
        `${packRules.required_traits?.length || 0} required traits` +
        (packRules.required_career ? `, career ${packRules.required_career}` : "") +
        ".";
      if (requiredExamples.length > 0) {
        packLegacySummary += ` Example required goals: ${requiredExamples.join("; ")}.`;
      }
      if (optionalExamples.length > 0) {
        packLegacySummary += ` Example optional goals: ${optionalExamples.join("; ")}.`;
      }
    }
  }

  const context = {
    legacy: {
      id: legacy.legacy_id,
      name: legacy.legacy_name,
      current_generation: legacy.current_generation,
    },
    active_generation: activeGeneration,
    household: householdResult.rows,
    milestones_summary: {
      total: milestoneTotal,
      byCategory: milestoneSummaryResult.rows,
      recent: recentMilestonesResult.rows,
    },
  };

  return {
    systemPrompt: SYSTEM_PROMPT,
    context,
    contextText: buildContextText({
      ...context,
      active_generation: activeGeneration
        ? {
            ...activeGeneration,
            goalsSummary: summarizeGoals(goals),
            requirementsSummary: summarizeRequirements(requiredTraits, requiredCareers),
            packLegacySummary,
          }
        : null,
      milestonesSummary: summarizeMilestones(
        {
          total: milestoneTotal,
          byCategory: milestoneSummaryResult.rows,
        },
        recentMilestonesResult.rows,
        "current household"
      ),
    }),
  };
};

module.exports = {
  SYSTEM_PROMPT,
  buildLegacyContext,
};
