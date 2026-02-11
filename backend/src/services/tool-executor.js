/**
 * Tool Executor — executes AI agent tool calls against the database.
 *
 * Authorization model:
 *   The agent handler verifies verifyLegacyOwnership() before creating the executor.
 *   All queries are scoped to the legacy via legacyId, so cross-user access is impossible.
 */

const { getPool } = require("../db/pool");

class ToolExecutor {
  constructor(legacyId, userId) {
    this.legacyId = legacyId;
    this.userId = userId;
  }

  /**
   * Route a tool call to the appropriate handler.
   * Always returns { success, message, data? } or { success: false, error }.
   */
  async execute(toolName, toolInput) {
    try {
      switch (toolName) {
        case "get_sim_details":
          return await this._getSimDetails(toolInput);
        case "get_generation_progress":
          return await this._getGenerationProgress();
        case "update_sim_skill":
          return await this._updateSimSkill(toolInput);
        case "update_sim_career":
          return await this._updateSimCareer(toolInput);
        case "create_sim":
          return await this._createSim(toolInput);
        case "complete_aspiration":
          return await this._completeAspiration(toolInput);
        case "add_milestone":
          return await this._addMilestone(toolInput);
        case "add_sim_trait":
          return await this._addSimTrait(toolInput);
        case "add_relationship":
          return await this._addRelationship(toolInput);
        case "complete_generation_goal":
          return await this._completeGenerationGoal(toolInput);
        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (err) {
      console.error(`Tool executor error (${toolName}):`, err);
      return {
        success: false,
        error: `Internal error executing ${toolName}: ${err.message || "unknown error"}`,
      };
    }
  }

  // ─── Read-Only Tools ────────────────────────────────────────────

  async _getSimDetails({ sim_name }) {
    const sim = await this._findSimByName(sim_name);
    if (!sim) {
      return { success: false, error: `Sim '${sim_name}' not found in your legacy` };
    }

    const pool = await getPool();

    const [traitsRes, skillsRes, careersRes, aspirationsRes] = await Promise.all([
      pool.query(
        `SELECT t.trait_name, st.trait_slot
         FROM sim_traits st
         JOIN traits t ON st.trait_id = t.trait_id
         WHERE st.sim_id = $1
         ORDER BY st.trait_slot`,
        [sim.sim_id]
      ),
      pool.query(
        `SELECT sk.skill_name, ss.current_level, ss.is_maxed, sk.max_level
         FROM sim_skills ss
         JOIN skills sk ON ss.skill_id = sk.skill_id
         WHERE ss.sim_id = $1
         ORDER BY sk.skill_name`,
        [sim.sim_id]
      ),
      pool.query(
        `SELECT c.career_name, cb.branch_name, sc.current_level, sc.is_current, sc.is_completed
         FROM sim_careers sc
         JOIN careers c ON sc.career_id = c.career_id
         LEFT JOIN career_branches cb ON sc.branch_id = cb.branch_id
         WHERE sc.sim_id = $1
         ORDER BY sc.is_current DESC, c.career_name`,
        [sim.sim_id]
      ),
      pool.query(
        `SELECT a.aspiration_name, sa.is_completed, sa.is_current
         FROM sim_aspirations sa
         JOIN aspirations a ON sa.aspiration_id = a.aspiration_id
         WHERE sa.sim_id = $1
         ORDER BY sa.is_current DESC, a.aspiration_name`,
        [sim.sim_id]
      ),
    ]);

    return {
      success: true,
      message: `Details for ${sim.name}`,
      data: {
        name: sim.name,
        life_stage: sim.life_stage,
        gender: sim.gender,
        occult_type: sim.occult_type,
        status: sim.status,
        is_heir: sim.is_generation_heir,
        current_household: sim.current_household,
        traits: traitsRes.rows.map((r) => `${r.trait_name} (${r.trait_slot})`),
        skills: skillsRes.rows.map(
          (r) => `${r.skill_name}: ${r.current_level}/${r.max_level}${r.is_maxed ? " (MAXED)" : ""}`
        ),
        careers: careersRes.rows.map(
          (r) =>
            `${r.career_name}${r.branch_name ? ` - ${r.branch_name}` : ""}: level ${r.current_level}` +
            `${r.is_current ? " (current)" : ""}${r.is_completed ? " (completed)" : ""}`
        ),
        aspirations: aspirationsRes.rows.map(
          (r) =>
            `${r.aspiration_name}${r.is_current ? " (current)" : ""}${r.is_completed ? " (completed)" : ""}`
        ),
      },
    };
  }

  async _getGenerationProgress() {
    const generation = await this._getCurrentGeneration();
    if (!generation) {
      return { success: false, error: "No active generation found" };
    }

    const pool = await getPool();
    const goalsRes = await pool.query(
      `SELECT goal_text, is_optional, is_completed
       FROM generation_goals
       WHERE generation_id = $1
       ORDER BY is_optional ASC, goal_text ASC`,
      [generation.generation_id]
    );

    const goals = goalsRes.rows;
    const required = goals.filter((g) => !g.is_optional);
    const optional = goals.filter((g) => g.is_optional);
    const requiredComplete = required.filter((g) => g.is_completed).length;
    const optionalComplete = optional.filter((g) => g.is_completed).length;

    return {
      success: true,
      message: `Generation ${generation.generation_number} progress`,
      data: {
        generation_number: generation.generation_number,
        pack_name: generation.pack_name,
        required_goals: required.map((g) => `${g.is_completed ? "[x]" : "[ ]"} ${g.goal_text}`),
        optional_goals: optional.map((g) => `${g.is_completed ? "[x]" : "[ ]"} ${g.goal_text}`),
        summary: `Required: ${requiredComplete}/${required.length}, Optional: ${optionalComplete}/${optional.length}`,
      },
    };
  }

  // ─── Write Tools ────────────────────────────────────────────────

  async _updateSimSkill({ sim_name, skill_name, new_level }) {
    const sim = await this._findSimByName(sim_name);
    if (!sim) {
      return { success: false, error: `Sim '${sim_name}' not found in your legacy` };
    }

    const skill = await this._findSkillByName(skill_name);
    if (!skill) {
      return { success: false, error: `Skill '${skill_name}' not found` };
    }

    const isMaxed = new_level >= skill.max_level;
    const maxedDate = isMaxed ? new Date().toISOString().slice(0, 10) : null;

    const pool = await getPool();
    try {
      await pool.query(
        `INSERT INTO sim_skills (sim_id, skill_id, current_level, is_maxed, maxed_date)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (sim_id, skill_id) DO UPDATE SET
           current_level = $3,
           is_maxed = $4,
           maxed_date = COALESCE($5, sim_skills.maxed_date)
         RETURNING *`,
        [sim.sim_id, skill.skill_id, new_level, isMaxed, maxedDate]
      );
    } catch (err) {
      if (err.code === "23503") {
        return { success: false, error: "Referenced sim or skill does not exist" };
      }
      throw err;
    }

    const msg = isMaxed
      ? `${sim.name}'s ${skill.skill_name} updated to level ${new_level} (MAXED!)`
      : `${sim.name}'s ${skill.skill_name} updated to level ${new_level}/${skill.max_level}`;

    return { success: true, message: msg };
  }

  async _updateSimCareer({ sim_name, promotions = 1 }) {
    const sim = await this._findSimByName(sim_name);
    if (!sim) {
      return { success: false, error: `Sim '${sim_name}' not found in your legacy` };
    }

    const pool = await getPool();
    const careerRes = await pool.query(
      `SELECT sc.sim_career_id, sc.current_level, sc.is_completed,
              c.career_name, cb.branch_name
       FROM sim_careers sc
       JOIN careers c ON sc.career_id = c.career_id
       LEFT JOIN career_branches cb ON sc.branch_id = cb.branch_id
       WHERE sc.sim_id = $1 AND sc.is_current = TRUE`,
      [sim.sim_id]
    );

    if (careerRes.rows.length === 0) {
      return { success: false, error: `${sim.name} has no active career` };
    }

    const career = careerRes.rows[0];
    const MAX_CAREER_LEVEL = 10;
    const newLevel = Math.min(career.current_level + promotions, MAX_CAREER_LEVEL);

    if (newLevel < 1) {
      return { success: false, error: `Career level cannot go below 1 (current: ${career.current_level})` };
    }

    const isCompleted = newLevel >= MAX_CAREER_LEVEL;
    const completionDate = isCompleted ? new Date().toISOString().slice(0, 10) : null;

    await pool.query(
      `UPDATE sim_careers
       SET current_level = $1,
           is_completed = $2,
           completion_date = COALESCE($3, completion_date)
       WHERE sim_career_id = $4`,
      [newLevel, isCompleted, completionDate, career.sim_career_id]
    );

    const careerLabel = career.branch_name
      ? `${career.career_name} (${career.branch_name})`
      : career.career_name;

    const msg =
      promotions === 1
        ? `${sim.name} promoted in ${careerLabel} to level ${newLevel}`
        : `${sim.name} promoted ${promotions} times in ${careerLabel} to level ${newLevel}`;

    return {
      success: true,
      message: isCompleted ? `${msg} (CAREER COMPLETE!)` : msg,
    };
  }

  async _createSim({ name, gender, life_stage, parent_name, parent_names, traits = [] }) {
    const generation = await this._getCurrentGeneration();
    if (!generation) {
      return { success: false, error: "No active generation found" };
    }

    let motherId = null;
    let fatherId = null;
    const parentIds = [];

    const normalizedParentNames = [
      ...(Array.isArray(parent_names) ? parent_names : []),
      ...(parent_name ? [parent_name] : []),
    ]
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter((value) => value.length > 0);

    const uniqueParentNames = [...new Set(normalizedParentNames)];

    if (uniqueParentNames.length > 0) {
      for (const parentName of uniqueParentNames) {
        const parent = await this._findSimByName(parentName);
        if (!parent) continue;

        if (parent.gender === "female" && !motherId) {
          motherId = parent.sim_id;
        } else if (parent.gender === "male" && !fatherId) {
          fatherId = parent.sim_id;
        }

        parentIds.push({ id: parent.sim_id, name: parent.name });
      }
    }

    const pool = await getPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const simRes = await client.query(
        `INSERT INTO sims (legacy_id, generation_id, name, gender, life_stage,
                           mother_id, father_id, current_household, is_generation_heir, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, FALSE, 'alive')
         RETURNING sim_id, name`,
        [this.legacyId, generation.generation_id, name, gender, life_stage, motherId, fatherId]
      );

      const newSim = simRes.rows[0];

      // Add traits if provided
      for (const traitName of traits) {
        const trait = await this._findTraitByName(traitName);
        if (trait) {
          try {
            await client.query(
              `INSERT INTO sim_traits (sim_id, trait_id)
               VALUES ($1, $2)
               ON CONFLICT DO NOTHING`,
              [newSim.sim_id, trait.trait_id]
            );
          } catch (_) {
            // skip invalid traits silently
          }
        }
      }

      // Add parent relationship(s) if parents found
      if (parentIds.length > 0) {
        for (const parent of parentIds) {
          try {
            await client.query(
              `INSERT INTO relationships (sim_id_1, sim_id_2, relationship_type, is_active)
               VALUES ($1, $2, 'parent', TRUE)
               ON CONFLICT DO NOTHING`,
              [parent.id, newSim.sim_id]
            );
          } catch (_) {
            // relationship insert failures are non-fatal
          }
        }
      }

      await client.query("COMMIT");

      return {
        success: true,
        message: `Created new sim: ${name} (${life_stage}, ${gender})` +
          (parentIds.length > 0
            ? `, child of ${parentIds.map((parent) => parent.name).join(" and ")}`
            : ""),
        data: { sim_id: newSim.sim_id, name: newSim.name },
      };
    } catch (err) {
      try { await client.query("ROLLBACK"); } catch (_) { /* ignore */ }
      if (err.code === "23503") {
        return { success: false, error: "Invalid reference (legacy or generation not found)" };
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async _completeAspiration({ sim_name, aspiration_name }) {
    const sim = await this._findSimByName(sim_name);
    if (!sim) {
      return { success: false, error: `Sim '${sim_name}' not found in your legacy` };
    }

    const aspiration = await this._findAspirationByName(aspiration_name);
    if (!aspiration) {
      return { success: false, error: `Aspiration '${aspiration_name}' not found` };
    }

    const pool = await getPool();
    const completionDate = new Date().toISOString().slice(0, 10);

    // Try to update existing record first
    const updateRes = await pool.query(
      `UPDATE sim_aspirations
       SET is_completed = TRUE, completion_date = $1
       WHERE sim_id = $2 AND aspiration_id = $3
       RETURNING *`,
      [completionDate, sim.sim_id, aspiration.aspiration_id]
    );

    if (updateRes.rows.length > 0) {
      return {
        success: true,
        message: `${sim.name} completed the ${aspiration.aspiration_name} aspiration!`,
      };
    }

    // No existing record — insert as completed
    try {
      await pool.query(
        `INSERT INTO sim_aspirations (sim_id, aspiration_id, is_completed, completion_date)
         VALUES ($1, $2, TRUE, $3)`,
        [sim.sim_id, aspiration.aspiration_id, completionDate]
      );
    } catch (err) {
      if (err.code === "23505") {
        return { success: true, message: `${sim.name} already completed ${aspiration.aspiration_name}` };
      }
      throw err;
    }

    return {
      success: true,
      message: `${sim.name} completed the ${aspiration.aspiration_name} aspiration!`,
    };
  }

  async _addMilestone({ sim_name, milestone_name, notes }) {
    const sim = await this._findSimByName(sim_name);
    if (!sim) {
      return { success: false, error: `Sim '${sim_name}' not found in your legacy` };
    }

    const milestone = await this._findMilestoneByName(milestone_name);
    if (!milestone) {
      return { success: false, error: `Milestone '${milestone_name}' not found` };
    }

    const pool = await getPool();
    try {
      await pool.query(
        `INSERT INTO sim_milestones (sim_id, milestone_id, achieved_date, notes)
         VALUES ($1, $2, CURRENT_DATE, $3)`,
        [sim.sim_id, milestone.milestone_id, notes || null]
      );
    } catch (err) {
      if (err.code === "23505") {
        return { success: true, message: `${sim.name} already has the '${milestone.milestone_name}' milestone` };
      }
      throw err;
    }

    return {
      success: true,
      message: `Added milestone '${milestone.milestone_name}' to ${sim.name}`,
    };
  }

  async _addSimTrait({ sim_name, trait_name, trait_slot = "1" }) {
    const sim = await this._findSimByName(sim_name);
    if (!sim) {
      return { success: false, error: `Sim '${sim_name}' not found in your legacy` };
    }

    const trait = await this._findTraitByName(trait_name);
    if (!trait) {
      return { success: false, error: `Trait '${trait_name}' not found` };
    }

    const pool = await getPool();
    try {
      await pool.query(
        `INSERT INTO sim_traits (sim_id, trait_id, trait_slot, acquired_date)
         VALUES ($1, $2, $3, CURRENT_DATE)`,
        [sim.sim_id, trait.trait_id, trait_slot]
      );
    } catch (err) {
      if (err.code === "23505") {
        return { success: true, message: `${sim.name} already has the '${trait.trait_name}' trait` };
      }
      throw err;
    }

    return {
      success: true,
      message: `Added trait '${trait.trait_name}' (slot ${trait_slot}) to ${sim.name}`,
    };
  }

  async _addRelationship({ sim_name_1, sim_name_2, relationship_type }) {
    const sim1 = await this._findSimByName(sim_name_1);
    if (!sim1) {
      return { success: false, error: `Sim '${sim_name_1}' not found in your legacy` };
    }

    const sim2 = await this._findSimByName(sim_name_2);
    if (!sim2) {
      return { success: false, error: `Sim '${sim_name_2}' not found in your legacy` };
    }

    if (sim1.sim_id === sim2.sim_id) {
      return { success: false, error: "Cannot create a relationship between a sim and themselves" };
    }

    const pool = await getPool();
    try {
      await pool.query(
        `INSERT INTO relationships (sim_id_1, sim_id_2, relationship_type, is_active, started_date)
         VALUES ($1, $2, $3, TRUE, CURRENT_DATE)`,
        [sim1.sim_id, sim2.sim_id, relationship_type]
      );
    } catch (err) {
      if (err.code === "23505") {
        return {
          success: true,
          message: `${sim1.name} and ${sim2.name} already have a '${relationship_type}' relationship`,
        };
      }
      if (err.code === "23514") {
        // CHECK constraint violation (e.g., self-relationship)
        return { success: false, error: "Invalid relationship" };
      }
      throw err;
    }

    return {
      success: true,
      message: `Created '${relationship_type}' relationship between ${sim1.name} and ${sim2.name}`,
    };
  }

  async _completeGenerationGoal({ goal_text }) {
    const generation = await this._getCurrentGeneration();
    if (!generation) {
      return { success: false, error: "No active generation found" };
    }

    const pool = await getPool();

    // Escape LIKE metacharacters (%, _, \) to prevent pattern injection
    const escapedText = goal_text
      .toLowerCase()
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");

    // Fuzzy match: find goals containing the search text
    const goalsRes = await pool.query(
      `SELECT goal_id, goal_text, is_completed
       FROM generation_goals
       WHERE generation_id = $1 AND LOWER(goal_text) LIKE $2`,
      [generation.generation_id, `%${escapedText}%`]
    );

    if (goalsRes.rows.length === 0) {
      return { success: false, error: `No goal matching '${goal_text}' found in the current generation` };
    }

    // Pick first incomplete match, or first match if all complete
    const target = goalsRes.rows.find((g) => !g.is_completed) || goalsRes.rows[0];

    if (target.is_completed) {
      return { success: true, message: `Goal '${target.goal_text}' is already completed` };
    }

    await pool.query(
      `UPDATE generation_goals
       SET is_completed = TRUE, completion_date = CURRENT_DATE
       WHERE goal_id = $1`,
      [target.goal_id]
    );

    return {
      success: true,
      message: `Completed goal: '${target.goal_text}'`,
    };
  }

  // ─── Name Resolution Helpers ────────────────────────────────────

  async _findSimByName(name) {
    const pool = await getPool();
    const exactRes = await pool.query(
      `SELECT sim_id, name, gender, life_stage, occult_type, status, is_generation_heir, current_household
       FROM sims
       WHERE legacy_id = $1
         AND LOWER(name) = LOWER($2)
         AND status::text != 'deleted'
       ORDER BY current_household DESC, created_at DESC
       LIMIT 1`,
      [this.legacyId, name]
    );
    if (exactRes.rows.length > 0) {
      return exactRes.rows[0];
    }

    const fuzzyRes = await pool.query(
      `SELECT sim_id, name, gender, life_stage, occult_type, status, is_generation_heir, current_household
       FROM sims
       WHERE legacy_id = $1
         AND name ILIKE $2
         AND status::text != 'deleted'
       ORDER BY current_household DESC, created_at DESC
       LIMIT 1`,
      [this.legacyId, `%${name}%`]
    );

    return fuzzyRes.rows[0] || null;
  }

  async _findSkillByName(name) {
    const pool = await getPool();
    const res = await pool.query(
      `SELECT skill_id, skill_name, max_level
       FROM skills
       WHERE LOWER(skill_name) = LOWER($1)`,
      [name]
    );
    return res.rows[0] || null;
  }

  async _findTraitByName(name) {
    const pool = await getPool();
    const res = await pool.query(
      `SELECT trait_id, trait_name
       FROM traits
       WHERE LOWER(trait_name) = LOWER($1)`,
      [name]
    );
    return res.rows[0] || null;
  }

  async _findAspirationByName(name) {
    const pool = await getPool();
    const res = await pool.query(
      `SELECT aspiration_id, aspiration_name
       FROM aspirations
       WHERE LOWER(aspiration_name) = LOWER($1)`,
      [name]
    );
    return res.rows[0] || null;
  }

  async _findMilestoneByName(name) {
    const pool = await getPool();
    const res = await pool.query(
      `SELECT milestone_id, milestone_name, category
       FROM milestones
       WHERE LOWER(milestone_name) = LOWER($1)
       LIMIT 1`,
      [name]
    );
    return res.rows[0] || null;
  }

  async _getCurrentGeneration() {
    const pool = await getPool();
    const res = await pool.query(
      `SELECT generation_id, generation_number, pack_name
       FROM generations
       WHERE legacy_id = $1 AND is_active = TRUE
       LIMIT 1`,
      [this.legacyId]
    );
    return res.rows[0] || null;
  }
}

module.exports = { ToolExecutor };
