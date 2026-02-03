#!/usr/bin/env node

/**
 * Lightweight SQL migration runner with rollback support.
 *
 * Usage:
 *   node database/scripts/migrate.js up
 *   node database/scripts/migrate.js down --steps=1
 *   node database/scripts/migrate.js status
 *   node database/scripts/migrate.js baseline
 *
 * Environment variables (or .env file):
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 */

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'migrations')

const args = process.argv.slice(2)
const command = args[0] || 'status'
const stepsArg = args.find(arg => arg.startsWith('--steps='))
const steps = stepsArg ? parseInt(stepsArg.split('=')[1], 10) : 1

if (Number.isNaN(steps) || steps < 1) {
  console.error('Invalid --steps value. Must be a positive integer.')
  process.exit(1)
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'sims_legacy',
  user: process.env.DB_USER || 'sims_admin',
  password: process.env.DB_PASSWORD,
  max: 5,
})

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
}

function listMigrationFiles(direction) {
  const suffix = direction === 'down' ? '.down.sql' : '.up.sql'
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith(suffix))
    .sort()
}

async function fetchAppliedMigrations(client) {
  const result = await client.query(
    'SELECT filename, applied_at FROM schema_migrations ORDER BY filename'
  )
  return result.rows
}

async function applyMigration(client, filename) {
  const fullPath = path.join(MIGRATIONS_DIR, filename)
  const sql = fs.readFileSync(fullPath, 'utf8')
  await client.query(sql)
  await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename])
}

async function rollbackMigration(client, filename) {
  const downFilename = filename.replace('.up.sql', '.down.sql')
  const fullPath = path.join(MIGRATIONS_DIR, downFilename)
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing down migration for ${filename}`)
  }
  const sql = fs.readFileSync(fullPath, 'utf8')
  await client.query(sql)
  await client.query('DELETE FROM schema_migrations WHERE filename = $1', [filename])
}

async function showStatus(client) {
  await ensureMigrationsTable(client)
  const applied = await fetchAppliedMigrations(client)
  const appliedSet = new Set(applied.map(row => row.filename))
  const all = listMigrationFiles('up')

  console.log('Migration status:')
  for (const file of all) {
    const status = appliedSet.has(file) ? 'applied' : 'pending'
    console.log(`- ${file}: ${status}`)
  }
  if (all.length === 0) {
    console.log('No migration files found.')
  }
}

async function baselineMigrations(client) {
  await ensureMigrationsTable(client)
  const applied = await fetchAppliedMigrations(client)
  const appliedSet = new Set(applied.map(row => row.filename))
  const all = listMigrationFiles('up')
  const missing = all.filter(file => !appliedSet.has(file))

  if (missing.length === 0) {
    console.log('All migrations already recorded.')
    return
  }

  for (const file of missing) {
    console.log(`Recording baseline for ${file}...`)
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file])
  }
  console.log('Baseline recording complete.')
}

async function migrateUp(client) {
  await ensureMigrationsTable(client)
  const applied = await fetchAppliedMigrations(client)
  const appliedSet = new Set(applied.map(row => row.filename))
  const all = listMigrationFiles('up')
  const pending = all.filter(file => !appliedSet.has(file))

  if (pending.length === 0) {
    console.log('No pending migrations.')
    return
  }

  for (const file of pending) {
    console.log(`Applying ${file}...`)
    await client.query('BEGIN')
    try {
      await applyMigration(client, file)
      await client.query('COMMIT')
      console.log(`Applied ${file}`)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  }
}

async function migrateDown(client) {
  await ensureMigrationsTable(client)
  const applied = await fetchAppliedMigrations(client)
  if (applied.length === 0) {
    console.log('No applied migrations to roll back.')
    return
  }

  const toRollback = applied.slice(-steps)
  for (const row of toRollback.reverse()) {
    console.log(`Rolling back ${row.filename}...`)
    await client.query('BEGIN')
    try {
      await rollbackMigration(client, row.filename)
      await client.query('COMMIT')
      console.log(`Rolled back ${row.filename}`)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  }
}

async function main() {
  const client = await pool.connect()
  try {
    if (command === 'up') {
      await migrateUp(client)
    } else if (command === 'down') {
      await migrateDown(client)
    } else if (command === 'status') {
      await showStatus(client)
    } else if (command === 'baseline') {
      await baselineMigrations(client)
    } else {
      console.error('Unknown command. Use up, down, status, or baseline.')
      process.exit(1)
    }
  } catch (error) {
    console.error('Migration failed:', error.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

main()