#!/usr/bin/env node

/**
 * Main database seeding orchestrator.
 * Seeds all reference data and pack legacy generation templates.
 *
 * Usage: node database/scripts/seed.js
 *
 * Environment variables (or .env file):
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 */

const { Pool } = require('pg')
require('dotenv').config()
const { seedReferenceData } = require('./seed-reference-data')
const { seedPackLegacy } = require('./seed-pack-legacy')

/**
 * Creates and returns a configured pg Pool instance.
 * @returns {import('pg').Pool}
 */
function createPool() {
  const useSsl = process.env.DB_SSL === 'true'

  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'sims_legacy',
    user: process.env.DB_USER || 'sims_admin',
    password: process.env.DB_PASSWORD,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    max: 5,
  })
}

/**
 * Runs the full seeding pipeline inside a transaction.
 */
async function main() {
  const pool = createPool()
  const client = await pool.connect()

  console.log('========================================')
  console.log('  Sims Legacy Tracker - Database Seeder')
  console.log('========================================\n')

  try {
    await client.query('BEGIN')

    console.log('[1/2] Seeding reference data...\n')
    const refData = await seedReferenceData(client)

    console.log('\n[2/2] Seeding Pack Legacy Challenge generations...\n')
    await seedPackLegacy(client, refData)

    await client.query('COMMIT')
    console.log('\n========================================')
    console.log('  Seeding complete!')
    console.log('========================================')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('\nSeeding failed — transaction rolled back.')
    console.error('Error:', error.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
