#!/usr/bin/env node

/**
 * Seeds Pack Legacy Challenge generation templates.
 *
 * Creates a "template" legacy with 35 generations, each with:
 *   - goals (required and optional)
 *   - required traits
 *   - required careers
 *
 * These templates are cloned when a user starts a new legacy.
 *
 * Usage (standalone): node database/scripts/seed-pack-legacy.js
 */

const { Pool } = require('pg')
const path = require('path')
const crypto = require('crypto')
require('dotenv').config()

const SEED_DIR = path.resolve(__dirname, '..', 'seed-data')

/**
 * Loads a JSON seed file from the seed-data directory.
 * @param {string} filename
 * @returns {Array<Object>}
 */
function loadSeedFile(filename) {
  return require(path.join(SEED_DIR, filename))
}

/**
 * Seeds the Pack Legacy Challenge generation templates.
 *
 * @param {import('pg').PoolClient} client
 * @param {Object} lookups - reference data lookup maps from seedReferenceData
 */
async function seedPackLegacy(client, lookups) {
  const generations = loadSeedFile('pack_legacy_generations.json')

  // Check if template legacy already exists
  const existingCheck = await client.query(
    `SELECT legacy_id FROM legacies WHERE legacy_name = $1`,
    ['Pack Legacy Challenge Template']
  )

  if (existingCheck.rows.length > 0) {
    console.log('  Pack Legacy Challenge template already exists — skipping.')
    return
  }

  // Create the template legacy
  const legacyResult = await client.query(
    `INSERT INTO legacies (legacy_name, current_generation, gender_law, bloodline_law, heir_law, species_law)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING legacy_id`,
    ['Pack Legacy Challenge Template', 1, 'equality', 'traditional', 'first_born', 'tolerant']
  )
  const legacyId = legacyResult.rows[0].legacy_id
  console.log(`  Created template legacy: ${legacyId}`)

  let goalsInserted = 0
  let traitsLinked = 0
  let careersLinked = 0

  for (const gen of generations) {
    // Insert generation
    const genResult = await client.query(
      `INSERT INTO generations (legacy_id, generation_number, pack_name, backstory, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING generation_id`,
      [legacyId, gen.generation_number, gen.pack_name, gen.backstory, gen.generation_number === 1]
    )
    const generationId = genResult.rows[0].generation_id

    // Insert required goals
    if (gen.required_goals) {
      for (const goal of gen.required_goals) {
        await client.query(
          `INSERT INTO generation_goals (generation_id, goal_text, is_optional)
           VALUES ($1, $2, $3)`,
          [generationId, goal.goal_text, false]
        )
        goalsInserted++
      }
    }

    // Insert optional goals
    if (gen.optional_goals) {
      for (const goal of gen.optional_goals) {
        await client.query(
          `INSERT INTO generation_goals (generation_id, goal_text, is_optional)
           VALUES ($1, $2, $3)`,
          [generationId, goal.goal_text, true]
        )
        goalsInserted++
      }
    }

    // Link required traits
    if (gen.required_traits && lookups.traits) {
      for (let i = 0; i < gen.required_traits.length; i++) {
        const traitName = gen.required_traits[i]
        const traitId = lookups.traits.get(traitName)
        if (traitId) {
          await client.query(
            `INSERT INTO generation_required_traits (generation_id, trait_id, trait_order)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [generationId, traitId, i + 1]
          )
          traitsLinked++
        } else {
          console.warn(`  Warning: trait "${traitName}" not found in reference data (Gen ${gen.generation_number})`)
        }
      }
    }

    // Link required career
    if (gen.required_career && lookups.careers) {
      const careerId = lookups.careers.get(gen.required_career)
      if (careerId) {
        let branchId = null
        if (gen.required_career_branch && lookups.branches) {
          branchId = lookups.branches.get(gen.required_career_branch) || null
        }

        await client.query(
          `INSERT INTO generation_required_careers (generation_id, career_id, branch_id)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [generationId, careerId, branchId]
        )
        careersLinked++
      } else {
        console.warn(`  Warning: career "${gen.required_career}" not found in reference data (Gen ${gen.generation_number})`)
      }
    }

    console.log(`  Gen ${String(gen.generation_number).padStart(2, ' ')}: ${gen.pack_name}`)
  }

  console.log(`\n  Summary:`)
  console.log(`    Generations: ${generations.length}`)
  console.log(`    Goals:       ${goalsInserted}`)
  console.log(`    Traits:      ${traitsLinked}`)
  console.log(`    Careers:     ${careersLinked}`)
}

// Allow standalone execution
if (require.main === module) {
  const { seedReferenceData } = require('./seed-reference-data')

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'sims_legacy',
    user: process.env.DB_USER || 'sims_admin',
    password: process.env.DB_PASSWORD,
    max: 5,
  })

  ;(async () => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      console.log('Loading reference data for FK lookups...\n')
      const lookups = await seedReferenceData(client)
      console.log('\nSeeding Pack Legacy generations...\n')
      await seedPackLegacy(client, lookups)
      await client.query('COMMIT')
      console.log('\nPack Legacy seeding complete.')
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Seeding failed:', error.message)
      process.exit(1)
    } finally {
      client.release()
      await pool.end()
    }
  })()
}

module.exports = { seedPackLegacy }
