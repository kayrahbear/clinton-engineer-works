#!/usr/bin/env node

/**
 * Sets the password for the default admin user created by migration 007.
 *
 * Usage:
 *   ADMIN_PASSWORD=mysecretpassword node database/scripts/seed-admin-user.js
 *
 * Or from backend/:
 *   ADMIN_PASSWORD=mysecretpassword npm run seed:admin
 */

const { Pool } = require('pg')
require('dotenv').config({ path: require('path').resolve(__dirname, '../../backend/.env') })

const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001'

async function main() {
  const password = process.env.ADMIN_PASSWORD
  if (!password) {
    console.error('Error: ADMIN_PASSWORD environment variable is required')
    console.error('Usage: ADMIN_PASSWORD=yourpassword node database/scripts/seed-admin-user.js')
    process.exit(1)
  }

  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters')
    process.exit(1)
  }

  // bcryptjs is in the backend dependencies
  const bcrypt = require('bcryptjs')
  const hash = await bcrypt.hash(password, 12)

  const useSsl = process.env.DB_SSL === 'true'
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'sims_legacy',
    user: process.env.DB_USER || 'sims_admin',
    password: process.env.DB_PASSWORD || '',
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  })

  try {
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE user_id = $2',
      [hash, ADMIN_USER_ID]
    )

    if (result.rowCount === 0) {
      console.error('Error: Admin user not found. Run migration 007 first.')
      process.exit(1)
    }

    console.log('Admin user password updated successfully.')
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Failed to seed admin user:', err.message)
  process.exit(1)
})
