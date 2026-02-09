require("dotenv").config({ path: "../backend/.env" });
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

async function seedTestSims() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    console.log("🌱 Starting test sim seeding...");

    // 1. Create test legacy (without current_generation_id which doesn't exist)
    console.log("Creating test legacy...");
    const legacyResult = await client.query(
      `INSERT INTO legacies (legacy_name, founder_id)
       VALUES ($1, NULL)
       RETURNING legacy_id`,
      ["The Sterling Legacy"]
    );
    const legacyId = legacyResult.rows[0].legacy_id;
    console.log(`✅ Created legacy: ${legacyId}`);

    // 2. Create generations (without generation_template_id and status which don't exist)
    console.log("Creating generations...");
    const gen1Result = await client.query(
      `INSERT INTO generations (legacy_id, generation_number, pack_name, is_active)
       VALUES ($1, 1, 'Base Game', FALSE)
       RETURNING generation_id`,
      [legacyId]
    );
    const gen1Id = gen1Result.rows[0].generation_id;

    const gen2Result = await client.query(
      `INSERT INTO generations (legacy_id, generation_number, pack_name, is_active)
       VALUES ($1, 2, 'Get to Work', FALSE)
       RETURNING generation_id`,
      [legacyId]
    );
    const gen2Id = gen2Result.rows[0].generation_id;

    const gen3Result = await client.query(
      `INSERT INTO generations (legacy_id, generation_number, pack_name, is_active)
       VALUES ($1, 3, 'City Living', TRUE)
       RETURNING generation_id`,
      [legacyId]
    );
    const gen3Id = gen3Result.rows[0].generation_id;
    console.log(`✅ Created 3 generations`);

    // 3. Get a sample world (San Myshuno for Sofia)
    const worldResult = await client.query(
      `SELECT world_id FROM worlds WHERE world_name = 'San Myshuno' LIMIT 1`
    );
    const worldId = worldResult.rows[0]?.world_id || null;

    // 4. Create sims
    console.log("Creating sims...");

    // Juniper Sterling (Gen 1, Elder, Founder)
    const juniperResult = await client.query(
      `INSERT INTO sims (
        legacy_id, generation_id, name, gender, life_stage, occult_type,
        status, is_legacy_founder, is_generation_heir, current_household, world_of_residence_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING sim_id`,
      [
        legacyId,
        gen1Id,
        "Juniper Sterling",
        "female",
        "elder",
        "human",
        "alive",
        true,
        true,
        false,
        worldId,
      ]
    );
    const juniperId = juniperResult.rows[0].sim_id;

    // Marco Sterling (Gen 2, Adult, Vampire, Juniper's child)
    const marcoResult = await client.query(
      `INSERT INTO sims (
        legacy_id, generation_id, name, gender, life_stage, occult_type,
        status, mother_id, is_generation_heir, current_household, world_of_residence_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING sim_id`,
      [
        legacyId,
        gen2Id,
        "Marco Sterling",
        "male",
        "adult",
        "vampire",
        "alive",
        juniperId,
        true,
        true,
        worldId,
      ]
    );
    const marcoId = marcoResult.rows[0].sim_id;

    // Sofia Sterling (Gen 3, Young Adult, Human, Heir - Marco's daughter)
    const sofiaResult = await client.query(
      `INSERT INTO sims (
        legacy_id, generation_id, name, gender, life_stage, occult_type,
        status, father_id, is_generation_heir, current_household, world_of_residence_id,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING sim_id`,
      [
        legacyId,
        gen3Id,
        "Sofia Sterling",
        "female",
        "young_adult",
        "human",
        "alive",
        marcoId,
        true,
        true,
        worldId,
        "Sofia is the heartbeat of the Sterling legacy—painting neon sunsets, hosting midnight gallery parties, and journaling every twist in her city-native dream.",
      ]
    );
    const sofiaId = sofiaResult.rows[0].sim_id;

    // Elena Sterling (Gen 3, Teen, Spellcaster - Sofia's sister)
    const elenaResult = await client.query(
      `INSERT INTO sims (
        legacy_id, generation_id, name, gender, life_stage, occult_type,
        status, father_id, is_generation_heir, current_household, world_of_residence_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING sim_id`,
      [
        legacyId,
        gen3Id,
        "Elena Sterling",
        "female",
        "teen",
        "spellcaster",
        "alive",
        marcoId,
        false,
        true,
        worldId,
      ]
    );
    const elenaId = elenaResult.rows[0].sim_id;

    console.log(`✅ Created 4 sims`);

    // 5. Update legacy with founder and current generation (INTEGER, not ID)
    await client.query(
      `UPDATE legacies SET founder_id = $1, current_generation = $2 WHERE legacy_id = $3`,
      [juniperId, 3, legacyId]
    );

    // 6. Get reference data IDs for traits, skills, aspirations, careers
    const traitIds = {};
    const traitNames = ["Creative", "Romantic", "Self-Assured", "Cheerful", "Family-Oriented", "Loyal", "Gloomy", "Bookworm", "Ambitious"];
    for (const traitName of traitNames) {
      const result = await client.query(
        `SELECT trait_id FROM traits WHERE trait_name = $1 LIMIT 1`,
        [traitName]
      );
      if (result.rows[0]) {
        traitIds[traitName] = result.rows[0].trait_id;
      }
    }

    const skillIds = {};
    const skillNames = ["Charisma", "Painting", "Wellness"];
    for (const skillName of skillNames) {
      const result = await client.query(
        `SELECT skill_id FROM skills WHERE skill_name = $1 LIMIT 1`,
        [skillName]
      );
      if (result.rows[0]) {
        skillIds[skillName] = result.rows[0].skill_id;
      }
    }

    // Get City Native aspiration
    const aspirationResult = await client.query(
      `SELECT aspiration_id FROM aspirations WHERE aspiration_name ILIKE '%City%' LIMIT 1`
    );
    const aspirationId = aspirationResult.rows[0]?.aspiration_id;

    // Get a social media/PR type career
    const careerResult = await client.query(
      `SELECT career_id FROM careers WHERE career_name ILIKE '%Social%' OR career_name ILIKE '%Media%' LIMIT 1`
    );
    const careerId = careerResult.rows[0]?.career_id;

    // 7. Add traits to sims
    console.log("Adding traits...");
    if (traitIds["Creative"]) {
      await client.query(
        `INSERT INTO sim_traits (sim_id, trait_id) VALUES ($1, $2)`,
        [sofiaId, traitIds["Creative"]]
      );
    }
    if (traitIds["Romantic"]) {
      await client.query(
        `INSERT INTO sim_traits (sim_id, trait_id) VALUES ($1, $2)`,
        [sofiaId, traitIds["Romantic"]]
      );
    }
    if (traitIds["Self-Assured"]) {
      await client.query(
        `INSERT INTO sim_traits (sim_id, trait_id) VALUES ($1, $2)`,
        [sofiaId, traitIds["Self-Assured"]]
      );
    }

    // Add traits to Juniper
    if (traitIds["Cheerful"]) {
      await client.query(
        `INSERT INTO sim_traits (sim_id, trait_id) VALUES ($1, $2)`,
        [juniperId, traitIds["Cheerful"]]
      );
    }
    if (traitIds["Family-Oriented"]) {
      await client.query(
        `INSERT INTO sim_traits (sim_id, trait_id) VALUES ($1, $2)`,
        [juniperId, traitIds["Family-Oriented"]]
      );
    }

    // Add traits to Marco
    if (traitIds["Loyal"]) {
      await client.query(
        `INSERT INTO sim_traits (sim_id, trait_id) VALUES ($1, $2)`,
        [marcoId, traitIds["Loyal"]]
      );
    }
    if (traitIds["Gloomy"]) {
      await client.query(
        `INSERT INTO sim_traits (sim_id, trait_id) VALUES ($1, $2)`,
        [marcoId, traitIds["Gloomy"]]
      );
    }

    // Add traits to Elena
    if (traitIds["Bookworm"]) {
      await client.query(
        `INSERT INTO sim_traits (sim_id, trait_id) VALUES ($1, $2)`,
        [elenaId, traitIds["Bookworm"]]
      );
    }
    if (traitIds["Ambitious"]) {
      await client.query(
        `INSERT INTO sim_traits (sim_id, trait_id) VALUES ($1, $2)`,
        [elenaId, traitIds["Ambitious"]]
      );
    }

    console.log(`✅ Added traits`);

    // 8. Add skills to Sofia (use current_level, not skill_level)
    console.log("Adding skills...");
    if (skillIds["Charisma"]) {
      await client.query(
        `INSERT INTO sim_skills (sim_id, skill_id, current_level) VALUES ($1, $2, $3)`,
        [sofiaId, skillIds["Charisma"], 8]
      );
    }
    if (skillIds["Painting"]) {
      await client.query(
        `INSERT INTO sim_skills (sim_id, skill_id, current_level, is_maxed) VALUES ($1, $2, $3, $4)`,
        [sofiaId, skillIds["Painting"], 10, true]
      );
    }
    if (skillIds["Wellness"]) {
      await client.query(
        `INSERT INTO sim_skills (sim_id, skill_id, current_level) VALUES ($1, $2, $3)`,
        [sofiaId, skillIds["Wellness"], 5]
      );
    }
    console.log(`✅ Added skills`);

    // 9. Add aspiration to Sofia (use is_current and is_completed, not is_active and progress_percentage)
    if (aspirationId) {
      console.log("Adding aspiration...");
      await client.query(
        `INSERT INTO sim_aspirations (sim_id, aspiration_id, is_current, is_completed)
         VALUES ($1, $2, $3, $4)`,
        [sofiaId, aspirationId, true, false]
      );
      console.log(`✅ Added aspiration`);
    }

    // 10. Add career to Sofia (use current_level and is_current, not career_level and is_active)
    if (careerId) {
      console.log("Adding career...");
      await client.query(
        `INSERT INTO sim_careers (sim_id, career_id, current_level, is_current)
         VALUES ($1, $2, $3, $4)`,
        [sofiaId, careerId, 7, true]
      );
      console.log(`✅ Added career`);
    }

    // 11. Add relationships (use relationships table, not sim_relationships)
    console.log("Adding relationships...");
    await client.query(
      `INSERT INTO relationships (sim_id_1, sim_id_2, relationship_type, is_active)
       VALUES ($1, $2, $3, $4)`,
      [sofiaId, elenaId, "sibling", true]
    );
    await client.query(
      `INSERT INTO relationships (sim_id_1, sim_id_2, relationship_type, is_active)
       VALUES ($1, $2, $3, $4)`,
      [sofiaId, marcoId, "parent", true]
    );
    await client.query(
      `INSERT INTO relationships (sim_id_1, sim_id_2, relationship_type, is_active)
       VALUES ($1, $2, $3, $4)`,
      [sofiaId, juniperId, "parent", true]
    );
    console.log(`✅ Added relationships`);

    await client.query("COMMIT");

    console.log("\n✅ Test sim seeding completed successfully!");
    console.log("\n📋 Test Data Summary:");
    console.log(`   Legacy ID: ${legacyId}`);
    console.log(`   Generation 1 ID: ${gen1Id}`);
    console.log(`   Generation 2 ID: ${gen2Id}`);
    console.log(`   Generation 3 ID: ${gen3Id}`);
    console.log(`   Juniper Sterling ID: ${juniperId}`);
    console.log(`   Marco Sterling ID: ${marcoId}`);
    console.log(`   Sofia Sterling ID: ${sofiaId}`);
    console.log(`   Elena Sterling ID: ${elenaId}`);
    console.log("\n💡 Copy these IDs to frontend/src/config.js:");
    console.log(`   LEGACY_ID: '${legacyId}',`);
    console.log(`   GENERATION_ID: '${gen3Id}',`);
    console.log(`   SOFIA_ID: '${sofiaId}',`);

    return {
      legacyId,
      gen3Id,
      sofiaId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error seeding test sims:", error);
    throw error;
  } finally {
    client.release();
  }
}

seedTestSims()
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
