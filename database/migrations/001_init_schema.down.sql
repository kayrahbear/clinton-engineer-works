-- 001_init_schema.down.sql
-- Rollback baseline schema for Sims 4 Legacy Challenge Tracker

-- Drop triggers and function
DROP TRIGGER IF EXISTS trg_legacies_updated_at ON legacies;
DROP TRIGGER IF EXISTS trg_generations_updated_at ON generations;
DROP TRIGGER IF EXISTS trg_sims_updated_at ON sims;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables (reverse dependency order)
DROP TABLE IF EXISTS legacy_collection_items;
DROP TABLE IF EXISTS legacy_collections;
DROP TABLE IF EXISTS life_events;
DROP TABLE IF EXISTS generation_required_careers;
DROP TABLE IF EXISTS generation_required_traits;
DROP TABLE IF EXISTS generation_goals;
DROP TABLE IF EXISTS relationships;
DROP TABLE IF EXISTS sim_careers;
DROP TABLE IF EXISTS sim_aspirations;
DROP TABLE IF EXISTS sim_skills;
DROP TABLE IF EXISTS sim_traits;
DROP TABLE IF EXISTS sims;
DROP TABLE IF EXISTS generations;
DROP TABLE IF EXISTS legacies;
DROP TABLE IF EXISTS collection_items;
DROP TABLE IF EXISTS collections;
DROP TABLE IF EXISTS worlds;
DROP TABLE IF EXISTS career_skills;
DROP TABLE IF EXISTS career_branches;
DROP TABLE IF EXISTS careers;
DROP TABLE IF EXISTS traits;
DROP TABLE IF EXISTS aspirations;
DROP TABLE IF EXISTS skills;

-- Drop enum types
DROP TYPE IF EXISTS life_event_type;
DROP TYPE IF EXISTS relationship_type;
DROP TYPE IF EXISTS item_rarity;
DROP TYPE IF EXISTS world_type;
DROP TYPE IF EXISTS career_type;
DROP TYPE IF EXISTS trait_slot;
DROP TYPE IF EXISTS trait_type;
DROP TYPE IF EXISTS sim_status;
DROP TYPE IF EXISTS occult_type;
DROP TYPE IF EXISTS life_stage;
DROP TYPE IF EXISTS species_law;
DROP TYPE IF EXISTS heir_law;
DROP TYPE IF EXISTS bloodline_law;
DROP TYPE IF EXISTS gender_law;