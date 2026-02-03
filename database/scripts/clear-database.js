#!/usr/bin/env node

/**
 * Clears all data from the database.
 * Tables are truncated in reverse dependency order to avoid FK violations.
 *
 * Usage: node database/scripts/clear-database.js
 *        node database/scripts/clear-database.js --yes  (skip confirmation)
 */

const { Pool } = require('pg')
const readline = require('readline')
require('dotenv').config()

/**
 * Tables in reverse dependency order for safe truncation.
 * Junction/leaf tables first, then core tables, then reference tables.
 */
const TABLES_IN_ORDER = [
  // Leaf / junction tables
  'legacy_collection_items',
  'legacy_collections',
  'life_events',
  'generation_required_careers',
  'generation_required_traits',
  'generation_goals',
  'relationships',
  'sim_careers',
  'sim_aspirations',
  'sim_skills',
  'sim_traits',
  // Core gameplay tables (sims before generations/legacies due to FKs)
  'sims',
  'generations',
  'legacies',
  // Reference junction tables
  'career_skills',
  'collection_items',
  'career_branches',
  // Reference tables
  'collections',
  'worlds',
  'careers',
  'traits',
  'aspirations',
  'skills',
]

/**
 * Prompts the user for confirmation before clearing the database.
 * @returns {Promise<boolean>}
 */
function confirmClear() {
  const skipConfirmation = process.argv.includes('--yes')
  if (skipConfirmation) return Promise.resolve(true)

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise(resolve => {
    const dbName = process.env.DB_NAME || 'sims_legacy'
    rl.question(
      `\nThis will DELETE ALL DATA from the "${dbName}" database.\nType "yes" to confirm: `,
      answer => {
        rl.close()
        resolve(answer.trim().toLowerCase() === 'yes')
      }
    )
  })
}

async function main() {
  const confirmed = await confirmClear()
  if (!confirmed) {
    console.log('Aborted.')
    process.exit(0)
  }

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'sims_legacy',
    user: process.env.DB_USER || 'sims_admin',
    password: process.env.DB_PASSWORD,
    max: 5,
  })

  const client = await pool.connect()

  console.log('\nClearing database...\n')

  try {
    await client.query('BEGIN')

    // Temporarily disable FK checks by removing founder_id and heir_id references
    await client.query('UPDATE legacies SET founder_id = NULL')
    await client.query('UPDATE generations SET heir_id = NULL')

    for (const table of TABLES_IN_ORDER) {
      const result = await client.query(`DELETE FROM ${table}`)
      const count = result.rowCount
      if (count > 0) {
        console.log(`  Cleared ${String(count).padStart(5)} rows from ${table}`)
      } else {
        console.log(`  Cleared       0 rows from ${table}`)
      }
    }

    await client.query('COMMIT')
    console.log('\nDatabase cleared successfully.')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Clear failed:', error.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
