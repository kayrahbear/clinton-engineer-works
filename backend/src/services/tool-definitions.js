/**
 * Tool definitions for the AI Legacy Agent.
 * Each tool follows the Anthropic tool use spec (name, description, input_schema).
 * Tools use sim/skill/trait NAMES (not UUIDs) — the tool executor resolves names to IDs.
 */

const getToolDefinitions = () => [
  {
    name: "get_sim_details",
    description:
      "Fetch detailed information about a sim including their traits, skills, careers, and aspirations. " +
      "Use this to check a sim's current state before making updates, or when the user asks about a specific sim.",
    input_schema: {
      type: "object",
      properties: {
        sim_name: {
          type: "string",
          description: "The name of the sim to look up (e.g., 'Lavender', 'Marcus')",
        },
      },
      required: ["sim_name"],
    },
  },
  {
    name: "get_generation_progress",
    description:
      "Check the current generation's goal completion status. " +
      "Returns all required and optional goals with their completion state. " +
      "Use this when the user asks about progress or what goals remain.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "update_sim_skill",
    description:
      "Update or add a sim's skill level. Use this when the user mentions skill progression " +
      "(e.g., 'raised cooking to level 7', 'maxed fitness'). " +
      "If the skill reaches max level, it will automatically be marked as maxed.",
    input_schema: {
      type: "object",
      properties: {
        sim_name: {
          type: "string",
          description: "The name of the sim",
        },
        skill_name: {
          type: "string",
          description: "The name of the skill (e.g., 'Cooking', 'Fitness', 'Painting', 'Programming')",
        },
        new_level: {
          type: "integer",
          description: "The new skill level (1-10 for most skills, 1-5 for toddler/child skills)",
          minimum: 1,
          maximum: 10,
        },
      },
      required: ["sim_name", "skill_name", "new_level"],
    },
  },
  {
    name: "update_sim_career",
    description:
      "Update a sim's career level by a number of promotions. Use when the user mentions " +
      "promotions or career progression (e.g., 'was promoted twice', 'reached level 8 in her career').",
    input_schema: {
      type: "object",
      properties: {
        sim_name: {
          type: "string",
          description: "The name of the sim",
        },
        promotions: {
          type: "integer",
          description: "Number of promotions to add (default 1). Can be negative for demotions.",
          default: 1,
        },
      },
      required: ["sim_name"],
    },
  },
  {
    name: "create_sim",
    description:
      "Create a new sim. Use when the user mentions a birth, adoption, or new sim joining the household " +
      "(e.g., 'had a baby named Rose', 'adopted a toddler named Jasper'). " +
      "The new sim is automatically added to the current household.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The name of the new sim",
        },
        gender: {
          type: "string",
          enum: ["male", "female"],
          description: "The gender of the new sim",
        },
        life_stage: {
          type: "string",
          enum: ["infant", "toddler", "child", "teen", "young_adult", "adult", "elder"],
          description: "The life stage of the new sim (default 'infant' for births)",
        },
        parent_name: {
          type: "string",
          description: "The name of a parent sim (for births/adoptions). Used to link the family relationship.",
        },
        traits: {
          type: "array",
          items: { type: "string" },
          description: "Initial traits for the new sim (if any, e.g., for older sims)",
        },
      },
      required: ["name", "gender", "life_stage"],
    },
  },
  {
    name: "complete_aspiration",
    description:
      "Mark a sim's aspiration as completed. Use when the user says they completed an aspiration " +
      "(e.g., 'completed Master Chef', 'finished the Painter Extraordinaire aspiration').",
    input_schema: {
      type: "object",
      properties: {
        sim_name: {
          type: "string",
          description: "The name of the sim who completed the aspiration",
        },
        aspiration_name: {
          type: "string",
          description: "The name of the aspiration that was completed (e.g., 'Master Chef', 'Painter Extraordinaire')",
        },
      },
      required: ["sim_name", "aspiration_name"],
    },
  },
  {
    name: "add_milestone",
    description:
      "Add a milestone achievement to a sim. Use when the user mentions significant life events " +
      "(e.g., 'got married', 'had first kiss', 'graduated', 'learned to walk'). " +
      "Milestones are organized by category: firsts, life, social, fine_motor, gross_motor, cognitive, motor.",
    input_schema: {
      type: "object",
      properties: {
        sim_name: {
          type: "string",
          description: "The name of the sim",
        },
        milestone_name: {
          type: "string",
          description:
            "The name of the milestone (e.g., 'First Kiss', 'Got Married', 'Learned to Walk')",
        },
        notes: {
          type: "string",
          description: "Optional notes about the milestone (e.g., 'married to Marcus at the bluffs')",
        },
      },
      required: ["sim_name", "milestone_name"],
    },
  },
  {
    name: "add_sim_trait",
    description:
      "Add a trait to a sim. Use when sims age up and gain new traits, or when reward/bonus traits are earned " +
      "(e.g., 'picked Creative trait on aging up', 'earned the Handy reward trait').",
    input_schema: {
      type: "object",
      properties: {
        sim_name: {
          type: "string",
          description: "The name of the sim",
        },
        trait_name: {
          type: "string",
          description: "The name of the trait (e.g., 'Creative', 'Ambitious', 'Handy')",
        },
        trait_slot: {
          type: "string",
          enum: ["1", "2", "3", "bonus", "reward"],
          description:
            "Which trait slot to use (default '1'). Use '1', '2', '3' for personality traits, " +
            "'bonus' for bonus traits, 'reward' for satisfaction reward traits.",
        },
      },
      required: ["sim_name", "trait_name"],
    },
  },
  {
    name: "add_relationship",
    description:
      "Create a relationship between two sims. Use when the user mentions marriages, friendships, " +
      "romances, or family connections (e.g., 'Lavender married Marcus', 'Rose and Lily became enemies').",
    input_schema: {
      type: "object",
      properties: {
        sim_name_1: {
          type: "string",
          description: "The first sim's name",
        },
        sim_name_2: {
          type: "string",
          description: "The second sim's name",
        },
        relationship_type: {
          type: "string",
          enum: ["spouse", "romantic_interest", "friend", "enemy", "parent", "child", "sibling"],
          description: "The type of relationship between the two sims",
        },
      },
      required: ["sim_name_1", "sim_name_2", "relationship_type"],
    },
  },
  {
    name: "complete_generation_goal",
    description:
      "Mark a generation goal as complete. Use when the user says they completed a specific goal " +
      "from the current generation's goal list (e.g., 'completed the max cooking goal', " +
      "'finished the aspiration requirement'). The goal is matched by text similarity.",
    input_schema: {
      type: "object",
      properties: {
        goal_text: {
          type: "string",
          description:
            "The text of the goal to mark complete. Does not need to be an exact match — " +
            "a partial match or key phrase is sufficient (e.g., 'max cooking' to match 'Max the Cooking skill').",
        },
      },
      required: ["goal_text"],
    },
  },
];

module.exports = {
  getToolDefinitions,
};
