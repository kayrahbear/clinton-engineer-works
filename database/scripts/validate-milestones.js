#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const DATA_PATH = path.resolve(__dirname, '..', 'seed-data', 'milestones.json')

const VALID_CATEGORIES = new Set([
  'fine_motor',
  'gross_motor',
  'cognitive',
  'motor',
  'firsts',
  'life',
  'social',
])

const VALID_AGE_GROUPS = ['infant', 'toddler', 'child', 'teen', 'young_adult', 'adult', 'elder']
const AGE_INDEX = new Map(VALID_AGE_GROUPS.map((age, idx) => [age, idx]))

const VALID_PACKS = new Set([
  'Base Game',
  'Get to Work',
  'Get Together',
  'City Living',
  'Cats & Dogs',
  'Seasons',
  'Get Famous',
  'Island Living',
  'Discover University',
  'Eco Lifestyle',
  'Snowy Escape',
  'Cottage Living',
  'High School Years',
  'Growing Together',
  'Horse Ranch',
  'For Rent',
  'Lovestruck',
  'Life & Death',
  'Businesses and Hobbies',
  'Enchanted by Nature',
  'Outdoor Retreat',
  'Spa Day',
  'Dine Out',
  'Vampires',
  'Parenthood',
  'Jungle Adventure',
  'StrangerVille',
  'Realm of Magic',
  'Journey to Batuu',
  'Dream Home Decorator',
  'My Wedding Stories',
  'Werewolves',
  'Paranormal Stuff',
])

function loadMilestones() {
  const raw = fs.readFileSync(DATA_PATH, 'utf8')
  return JSON.parse(raw)
}

function normalizePackList(packRequired) {
  if (!packRequired || typeof packRequired !== 'string') return []
  return packRequired.split(' | ').map(p => p.trim()).filter(Boolean)
}

function isValidAge(age) {
  return age === null || VALID_AGE_GROUPS.includes(age)
}

function validateMilestones(data) {
  const errors = []
  const seen = new Set()
  const breakdown = {
    category: {},
    min_age_group: {},
    pack_required: {},
  }

  data.forEach((milestone, index) => {
    const pathLabel = `#${index + 1} ${milestone.milestone_name || '(missing name)'}`

    if (!milestone.milestone_name || milestone.milestone_name.trim().length === 0) {
      errors.push(`${pathLabel}: milestone_name is required`)
    }

    if (!milestone.description || milestone.description.trim().length === 0) {
      errors.push(`${pathLabel}: description is required`)
    }

    if (!VALID_CATEGORIES.has(milestone.category)) {
      errors.push(`${pathLabel}: invalid category '${milestone.category}'`)
    }

    if (!isValidAge(milestone.min_age_group)) {
      errors.push(`${pathLabel}: invalid min_age_group '${milestone.min_age_group}'`)
    }

    if (!isValidAge(milestone.max_age_group)) {
      errors.push(`${pathLabel}: invalid max_age_group '${milestone.max_age_group}'`)
    }

    if (milestone.max_age_group !== null && milestone.min_age_group) {
      const minIdx = AGE_INDEX.get(milestone.min_age_group)
      const maxIdx = AGE_INDEX.get(milestone.max_age_group)
      if (minIdx !== undefined && maxIdx !== undefined && maxIdx < minIdx) {
        errors.push(`${pathLabel}: max_age_group '${milestone.max_age_group}' is less than min_age_group '${milestone.min_age_group}'`)
      }
    }

    if (!milestone.pack_required || typeof milestone.pack_required !== 'string') {
      errors.push(`${pathLabel}: pack_required is required`)
    } else {
      const packList = normalizePackList(milestone.pack_required)
      if (packList.length === 0) {
        errors.push(`${pathLabel}: pack_required is empty`)
      }
      for (const pack of packList) {
        if (!VALID_PACKS.has(pack)) {
          errors.push(`${pathLabel}: invalid pack_required '${pack}'`)
        }
      }
    }

    const duplicateKey = `${milestone.milestone_name}||${milestone.min_age_group}||${milestone.max_age_group}`
    if (seen.has(duplicateKey)) {
      errors.push(`${pathLabel}: duplicate milestone (same name and age range)`)
    } else {
      seen.add(duplicateKey)
    }

    if (milestone.category) {
      breakdown.category[milestone.category] = (breakdown.category[milestone.category] || 0) + 1
    }
    if (milestone.min_age_group) {
      breakdown.min_age_group[milestone.min_age_group] = (breakdown.min_age_group[milestone.min_age_group] || 0) + 1
    }
    if (milestone.pack_required) {
      breakdown.pack_required[milestone.pack_required] = (breakdown.pack_required[milestone.pack_required] || 0) + 1
    }
  })

  return { errors, breakdown }
}

function printBreakdown(title, data) {
  console.log(`\n${title}:`)
  const entries = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0]))
  for (const [key, count] of entries) {
    console.log(`  ${key}: ${count}`)
  }
}

function main() {
  const data = loadMilestones()
  const { errors, breakdown } = validateMilestones(data)

  console.log('Milestone Validation Results')
  console.log('============================')
  console.log(`Total milestones: ${data.length}`)

  if (errors.length > 0) {
    console.log(`\nValidation errors (${errors.length}):`)
    for (const err of errors) {
      console.log(`  - ${err}`)
    }
    process.exitCode = 1
  } else {
    console.log('\nNo validation errors found.')
  }

  printBreakdown('Breakdown by category', breakdown.category)
  printBreakdown('Breakdown by min age group', breakdown.min_age_group)
  printBreakdown('Breakdown by pack', breakdown.pack_required)
}

main()
