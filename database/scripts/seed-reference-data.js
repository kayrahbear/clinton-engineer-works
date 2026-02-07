#!/usr/bin/env node

/**
 * Seeds all reference data tables from JSON files.
 *
 * Inserts in FK-safe order:
 *   1. skills
 *   2. aspirations
 *   3. traits (references aspirations)
 *   4. milestones
 *   5. careers
 *   6. career_branches (references careers)
 *   7. worlds
 *   8. collections
 *   9. collection_items (references collections)
 *   10. career_skills (references careers + skills)
 *
 * Idempotent: uses ON CONFLICT DO NOTHING so re-runs are safe.
 *
 * Usage (standalone): node database/scripts/seed-reference-data.js
 */

const { Pool } = require('pg')
const path = require('path')
require('dotenv').config({ path: '../backend/.env' })

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
 * Inserts rows into a table with a conflict target.
 * @param {import('pg').PoolClient} client
 * @param {string} table
 * @param {string[]} columns
 * @param {Array<Object>} rows
 * @param {string[]} conflictColumns
 * @returns {Promise<number>} count of inserted rows
 */
async function insertRowsWithConflict(client, table, columns, rows, conflictColumns) {
  if (rows.length === 0) return 0

  const placeholderGroups = rows.map((_, rowIdx) => {
    const offset = rowIdx * columns.length
    const placeholders = columns.map((_, colIdx) => `$${offset + colIdx + 1}`)
    return `(${placeholders.join(', ')})`
  })

  const values = rows.flatMap(row => columns.map(col => row[col] ?? null))
  const conflictTarget = conflictColumns.join(', ')

  const sql = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES ${placeholderGroups.join(',\n           ')}
    ON CONFLICT (${conflictTarget}) DO NOTHING
  `

  const result = await client.query(sql, values)
  return result.rowCount
}

/**
 * Inserts rows into a table, returning a name->id lookup map.
 * @param {import('pg').PoolClient} client
 * @param {string} table
 * @param {string[]} columns
 * @param {Array<Object>} rows
 * @param {string} nameColumn - column used as the lookup key
 * @param {string} idColumn - column used as the lookup value
 * @returns {Promise<Map<string, string>>} name -> uuid map
 */
async function insertRows(client, table, columns, rows, nameColumn, idColumn) {
  const lookup = new Map()

  if (rows.length === 0) return lookup

  const placeholderGroups = rows.map((_, rowIdx) => {
    const offset = rowIdx * columns.length
    const placeholders = columns.map((_, colIdx) => `$${offset + colIdx + 1}`)
    return `(${placeholders.join(', ')})`
  })

  const values = rows.flatMap(row => columns.map(col => row[col] ?? null))

  const conflictCol = columns.find(c => c === nameColumn)
  const returningCols = [idColumn, nameColumn].join(', ')

  const sql = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES ${placeholderGroups.join(',\n           ')}
    ON CONFLICT (${conflictCol}) DO NOTHING
    RETURNING ${returningCols}
  `

  const result = await client.query(sql, values)

  for (const row of result.rows) {
    lookup.set(row[nameColumn], row[idColumn])
  }

  // If rows already existed (conflict), fetch their IDs
  if (lookup.size < rows.length) {
    const existingNames = rows
      .map(r => r[nameColumn])
      .filter(name => !lookup.has(name))

    if (existingNames.length > 0) {
      const existingResult = await client.query(
        `SELECT ${idColumn}, ${nameColumn} FROM ${table} WHERE ${nameColumn} = ANY($1)`,
        [existingNames]
      )
      for (const row of existingResult.rows) {
        lookup.set(row[nameColumn], row[idColumn])
      }
    }
  }

  return lookup
}

/**
 * Seeds milestones from milestones.json.
 * @param {import('pg').PoolClient} client
 * @returns {Promise<number>} count of inserted milestones
 */
async function seedMilestones(client) {
  const milestonesData = loadSeedFile('milestones.json')
  const inserted = await insertRowsWithConflict(
    client,
    'milestones',
    [
      'milestone_name',
      'description',
      'category',
      'min_age_group',
      'max_age_group',
      'pack_required',
      'icon_path',
    ],
    milestonesData,
    ['milestone_name', 'min_age_group', 'max_age_group']
  )
  return inserted
}

/**
 * Seeds all reference data and returns lookup maps for FK linking.
 * @param {import('pg').PoolClient} client
 * @returns {Promise<Object>} lookup maps keyed by table name
 */
async function seedReferenceData(client) {
  const lookups = {}

  // 1. Skills
  const skillsData = loadSeedFile('skills.json')
  lookups.skills = await insertRows(
    client, 'skills',
    ['skill_name', 'max_level', 'ideal_mood', 'toddler_only', 'child_only', 'pack_required'],
    skillsData, 'skill_name', 'skill_id'
  )
  console.log(`  Inserted ${lookups.skills.size} skills`)

  // 2. Aspirations
  const aspirationsData = loadSeedFile('aspirations.json')
  lookups.aspirations = await insertRows(
    client, 'aspirations',
    ['aspiration_name', 'category', 'pack_required', 'child_only', 'description'],
    aspirationsData, 'aspiration_name', 'aspiration_id'
  )
  console.log(`  Inserted ${lookups.aspirations.size} aspirations`)

  // 3. Traits
  const traitsData = loadSeedFile('traits.json')
  lookups.traits = await insertRows(
    client, 'traits',
    ['trait_name', 'trait_type', 'price', 'toddler_only', 'child_only', 'pack_required'],
    traitsData, 'trait_name', 'trait_id'
  )
  console.log(`  Inserted ${lookups.traits.size} traits`)

  // 4. Milestones
  const milestonesInserted = await seedMilestones(client)
  console.log(`  ✅ Inserted ${milestonesInserted} milestones`)

  // 5. Careers
  const careersData = loadSeedFile('careers.json')
  lookups.careers = await insertRows(
    client, 'careers',
    ['career_name', 'max_level', 'has_branches', 'career_type', 'teen_eligible', 'university_only', 'pack_required'],
    careersData, 'career_name', 'career_id'
  )
  console.log(`  Inserted ${lookups.careers.size} careers`)

  // 6. Career Branches
  const branchesData = loadSeedFile('career_branches.json')
  const branchRows = branchesData.map(b => ({
    ...b,
    career_id: lookups.careers.get(b.career_name),
  }))
  lookups.branches = await insertBranches(client, branchRows)
  console.log(`  Inserted ${lookups.branches.size} career branches`)

  // 7. Worlds
  const worldsData = loadSeedFile('worlds.json')
  lookups.worlds = await insertRows(
    client, 'worlds',
    ['world_name', 'world_type', 'pack_required'],
    worldsData, 'world_name', 'world_id'
  )
  console.log(`  Inserted ${lookups.worlds.size} worlds`)

  // 8. Collections
  const collectionsData = loadSeedFile('collections.json')
  lookups.collections = await insertRows(
    client, 'collections',
    ['collection_name', 'total_items', 'pack_required'],
    collectionsData, 'collection_name', 'collection_id'
  )
  console.log(`  Inserted ${lookups.collections.size} collections`)

  // 9. Collection Items
  const itemsData = loadSeedFile('collection_items.json')
  const itemRows = itemsData.map(item => ({
    ...item,
    collection_id: lookups.collections.get(item.collection_name),
  }))
  const itemCount = await insertCollectionItems(client, itemRows)
  console.log(`  Inserted ${itemCount} collection items`)

  // 10. Career Skills
  const careerSkillsData = loadSeedFile('career_skills.json')
  const csCount = await insertCareerSkills(client, careerSkillsData, lookups)
  console.log(`  Inserted ${csCount} career-skill relationships`)

  return lookups
}

/**
 * Inserts career branches with FK to career_id.
 * @param {import('pg').PoolClient} client
 * @param {Array<Object>} rows
 * @returns {Promise<Map<string, string>>} branch_name -> branch_id
 */
async function insertBranches(client, rows) {
  const lookup = new Map()
  for (const row of rows) {
    if (!row.career_id) continue

    const result = await client.query(
      `INSERT INTO career_branches (career_id, branch_name, levels_in_branch)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING
       RETURNING branch_id, branch_name`,
      [row.career_id, row.branch_name, row.levels_in_branch]
    )

    if (result.rows.length > 0) {
      lookup.set(result.rows[0].branch_name, result.rows[0].branch_id)
    } else {
      // Already exists
      const existing = await client.query(
        `SELECT branch_id FROM career_branches WHERE career_id = $1 AND branch_name = $2`,
        [row.career_id, row.branch_name]
      )
      if (existing.rows.length > 0) {
        lookup.set(row.branch_name, existing.rows[0].branch_id)
      }
    }
  }
  return lookup
}

/**
 * Inserts collection items with FK to collection_id.
 * @param {import('pg').PoolClient} client
 * @param {Array<Object>} rows
 * @returns {Promise<number>} count of inserted items
 */
async function insertCollectionItems(client, rows) {
  let count = 0
  for (const row of rows) {
    if (!row.collection_id) continue

    const result = await client.query(
      `INSERT INTO collection_items (collection_id, item_name, rarity, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING
       RETURNING item_id`,
      [row.collection_id, row.item_name, row.rarity, row.description]
    )
    if (result.rows.length > 0) count++
  }
  return count
}

/**
 * Inserts career-skill relationships.
 * @param {import('pg').PoolClient} client
 * @param {Array<Object>} data
 * @param {Object} lookups
 * @returns {Promise<number>} count of inserted relationships
 */
async function insertCareerSkills(client, data, lookups) {
  let count = 0
  for (const row of data) {
    const careerId = lookups.careers.get(row.career_name)
    const skillId = lookups.skills.get(row.skill_name)
    if (!careerId || !skillId) continue

    const result = await client.query(
      `INSERT INTO career_skills (career_id, skill_id, is_primary)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING
       RETURNING career_id`,
      [careerId, skillId, row.is_primary]
    )
    if (result.rows.length > 0) count++
  }
  return count
}

// Allow standalone execution
if (require.main === module) {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  })

  ;(async () => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await seedReferenceData(client)
      await client.query('COMMIT')
      console.log('\nReference data seeding complete.')
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

module.exports = { seedReferenceData }
