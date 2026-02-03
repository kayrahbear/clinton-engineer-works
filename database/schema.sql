-- Sims 4 Legacy Challenge Tracker - Database Schema
-- PostgreSQL 15+
-- Run this script against a fresh database to create all tables

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Legacy succession laws
CREATE TYPE gender_law AS ENUM (
    'matriarchy', 'strict_matriarchy',
    'patriarchy', 'strict_patriarchy',
    'equality', 'strict_equality'
);

CREATE TYPE bloodline_law AS ENUM (
    'strict_traditional', 'traditional', 'modern', 'foster', 'strict_foster'
);

CREATE TYPE heir_law AS ENUM (
    'first_born', 'last_born', 'living_will', 'merit', 'strength',
    'random', 'exemplar', 'democracy', 'magical_bloodline', 'magical_strength'
);

CREATE TYPE species_law AS ENUM (
    'xenoarchy', 'xenophobic', 'brood', 'tolerant'
);

-- Sim enums
CREATE TYPE life_stage AS ENUM (
    'infant', 'toddler', 'child', 'teen', 'young_adult', 'adult', 'elder'
);

CREATE TYPE occult_type AS ENUM (
    'human', 'alien', 'vampire', 'spellcaster', 'werewolf', 'mermaid', 'servo', 'ghost'
);

CREATE TYPE sim_status AS ENUM (
    'alive', 'dead', 'moved_out'
);

-- Trait enums
CREATE TYPE trait_type AS ENUM (
    'personality', 'bonus', 'reward', 'lot', 'lifestyle'
);

-- Trait slot: which slot a trait occupies on a sim
CREATE TYPE trait_slot AS ENUM (
    '1', '2', '3', 'bonus', 'reward'
);

-- Career enums
CREATE TYPE career_type AS ENUM (
    'active', 'part_time', 'freelance', 'traditional'
);

-- World enums
CREATE TYPE world_type AS ENUM (
    'residential', 'vacation', 'secret'
);

-- Collection item rarity
CREATE TYPE item_rarity AS ENUM (
    'common', 'uncommon', 'rare'
);

-- Relationship types between sims
CREATE TYPE relationship_type AS ENUM (
    'spouse', 'romantic_interest', 'friend', 'enemy', 'parent', 'child', 'sibling'
);

-- Life event types
CREATE TYPE life_event_type AS ENUM (
    'birth', 'death', 'marriage', 'divorce', 'aging_up', 'graduation',
    'promotion', 'aspiration_complete', 'move_out', 'move_in'
);


-- ============================================================================
-- REFERENCE DATA TABLES
-- These tables store game content that rarely changes
-- ============================================================================

-- Skills available in the game
CREATE TABLE skills (
    skill_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_name VARCHAR(100) NOT NULL UNIQUE,
    max_level INTEGER NOT NULL DEFAULT 10,
    ideal_mood VARCHAR(50),
    toddler_only BOOLEAN NOT NULL DEFAULT FALSE,
    child_only BOOLEAN NOT NULL DEFAULT FALSE,
    pack_required VARCHAR(100) -- NULL means base game
);

COMMENT ON TABLE skills IS 'Reference data: all skills available in The Sims 4 and expansion packs';
COMMENT ON COLUMN skills.pack_required IS 'NULL indicates base game skill; otherwise the expansion/game pack name';

-- Aspirations available in the game
CREATE TABLE aspirations (
    aspiration_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aspiration_name VARCHAR(150) NOT NULL UNIQUE,
    category VARCHAR(100),
    pack_required VARCHAR(100),
    child_only BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT
);

COMMENT ON TABLE aspirations IS 'Reference data: all aspirations available in The Sims 4';

-- Traits available in the game
CREATE TABLE traits (
    trait_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trait_name VARCHAR(100) NOT NULL UNIQUE,
    trait_type trait_type NOT NULL,
    related_aspiration_id UUID REFERENCES aspirations(aspiration_id) ON DELETE SET NULL,
    price INTEGER DEFAULT 0, -- satisfaction points cost for reward traits
    toddler_only BOOLEAN NOT NULL DEFAULT FALSE,
    child_only BOOLEAN NOT NULL DEFAULT FALSE,
    pack_required VARCHAR(100)
);

COMMENT ON TABLE traits IS 'Reference data: all traits including personality, bonus, reward, lot, and lifestyle traits';
COMMENT ON COLUMN traits.price IS 'Satisfaction points cost; only relevant for reward traits';

-- Careers available in the game
CREATE TABLE careers (
    career_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    career_name VARCHAR(150) NOT NULL UNIQUE,
    max_level INTEGER NOT NULL DEFAULT 10,
    has_branches BOOLEAN NOT NULL DEFAULT FALSE,
    career_type career_type NOT NULL DEFAULT 'traditional',
    teen_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    university_only BOOLEAN NOT NULL DEFAULT FALSE,
    pack_required VARCHAR(100)
);

COMMENT ON TABLE careers IS 'Reference data: all careers available in The Sims 4';

-- Career branches (for careers that split into two paths)
CREATE TABLE career_branches (
    branch_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    career_id UUID NOT NULL REFERENCES careers(career_id) ON DELETE CASCADE,
    branch_name VARCHAR(150) NOT NULL,
    levels_in_branch INTEGER NOT NULL DEFAULT 4
);

COMMENT ON TABLE career_branches IS 'Career branches for careers that split (e.g., Doctor/Scientist paths)';

CREATE INDEX idx_career_branches_career_id ON career_branches(career_id);

-- Career-skill relationships (which skills help which careers)
CREATE TABLE career_skills (
    career_id UUID NOT NULL REFERENCES careers(career_id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(skill_id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE, -- primary skill vs supplementary
    PRIMARY KEY (career_id, skill_id)
);

COMMENT ON TABLE career_skills IS 'Many-to-many: which skills are required or helpful for each career';

-- Worlds in the game
CREATE TABLE worlds (
    world_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    world_name VARCHAR(100) NOT NULL UNIQUE,
    world_type world_type NOT NULL DEFAULT 'residential',
    pack_required VARCHAR(100)
);

COMMENT ON TABLE worlds IS 'Reference data: all worlds/neighborhoods in The Sims 4';

-- Collectible collections
CREATE TABLE collections (
    collection_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_name VARCHAR(150) NOT NULL UNIQUE,
    total_items INTEGER NOT NULL DEFAULT 0,
    pack_required VARCHAR(100)
);

COMMENT ON TABLE collections IS 'Reference data: collectible collections (fossils, crystals, etc.)';

-- Individual items within collections
CREATE TABLE collection_items (
    item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL REFERENCES collections(collection_id) ON DELETE CASCADE,
    item_name VARCHAR(150) NOT NULL,
    rarity item_rarity NOT NULL DEFAULT 'common',
    description TEXT
);

COMMENT ON TABLE collection_items IS 'Individual collectible items within each collection';

CREATE INDEX idx_collection_items_collection_id ON collection_items(collection_id);


-- ============================================================================
-- CORE GAMEPLAY TABLES
-- ============================================================================

-- Legacy challenge instances
CREATE TABLE legacies (
    legacy_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    legacy_name VARCHAR(200) NOT NULL,
    founder_id UUID, -- FK added after sims table is created
    start_date DATE,
    current_generation INTEGER NOT NULL DEFAULT 1,
    gender_law gender_law NOT NULL DEFAULT 'equality',
    bloodline_law bloodline_law NOT NULL DEFAULT 'traditional',
    heir_law heir_law NOT NULL DEFAULT 'first_born',
    species_law species_law NOT NULL DEFAULT 'tolerant',
    current_household_wealth DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total_wealth_accumulated DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total_sims_born INTEGER NOT NULL DEFAULT 0,
    total_deaths INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE legacies IS 'Top-level legacy challenge tracking; one row per legacy playthrough';
COMMENT ON COLUMN legacies.gender_law IS 'Succession law determining heir eligibility by gender';
COMMENT ON COLUMN legacies.bloodline_law IS 'Succession law determining heir eligibility by bloodline';
COMMENT ON COLUMN legacies.heir_law IS 'Succession law determining how the heir is chosen';
COMMENT ON COLUMN legacies.species_law IS 'Succession law determining heir eligibility by occult status';

-- Generations within a legacy
CREATE TABLE generations (
    generation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    legacy_id UUID NOT NULL REFERENCES legacies(legacy_id) ON DELETE CASCADE,
    generation_number INTEGER NOT NULL CHECK (generation_number BETWEEN 1 AND 35),
    pack_name VARCHAR(200), -- thematic pack/expansion for this generation
    heir_id UUID, -- FK added after sims table is created
    start_date DATE,
    completion_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    backstory TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (legacy_id, generation_number)
);

COMMENT ON TABLE generations IS 'Each generation within a legacy challenge';
COMMENT ON COLUMN generations.pack_name IS 'The themed expansion/game pack for this generation, if any';
COMMENT ON COLUMN generations.backstory IS 'Narrative backstory or theme for this generation';

CREATE INDEX idx_generations_legacy_id ON generations(legacy_id);

-- Sims (the core entity)
CREATE TABLE sims (
    sim_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    legacy_id UUID NOT NULL REFERENCES legacies(legacy_id) ON DELETE CASCADE,
    generation_id UUID NOT NULL REFERENCES generations(generation_id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    gender VARCHAR(50) NOT NULL,
    pronouns VARCHAR(50),
    portrait TEXT, -- image path or URL for sim portrait
    life_stage life_stage NOT NULL DEFAULT 'young_adult',
    occult_type occult_type NOT NULL DEFAULT 'human',
    status sim_status NOT NULL DEFAULT 'alive',
    cause_of_death VARCHAR(200),
    death_date DATE,
    buried_location VARCHAR(200),
    mother_id UUID REFERENCES sims(sim_id) ON DELETE SET NULL,
    father_id UUID REFERENCES sims(sim_id) ON DELETE SET NULL,
    birth_date DATE,
    world_of_residence_id UUID REFERENCES worlds(world_id) ON DELETE SET NULL,
    current_household BOOLEAN NOT NULL DEFAULT FALSE,
    is_heir BOOLEAN NOT NULL DEFAULT FALSE,
    is_founder BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sims IS 'All sims tracked in the legacy, including heirs, spouses, and children';
COMMENT ON COLUMN sims.portrait IS 'File path or URL to the sim portrait image';
COMMENT ON COLUMN sims.buried_location IS 'Where the sim is buried or their urn is placed';

CREATE INDEX idx_sims_legacy_id ON sims(legacy_id);
CREATE INDEX idx_sims_generation_id ON sims(generation_id);
CREATE INDEX idx_sims_mother_id ON sims(mother_id);
CREATE INDEX idx_sims_father_id ON sims(father_id);
CREATE INDEX idx_sims_world_of_residence_id ON sims(world_of_residence_id);
CREATE INDEX idx_sims_status ON sims(status);
CREATE INDEX idx_sims_is_heir ON sims(is_heir) WHERE is_heir = TRUE;

-- Now add deferred foreign keys from legacies and generations to sims
ALTER TABLE legacies
    ADD CONSTRAINT fk_legacies_founder
    FOREIGN KEY (founder_id) REFERENCES sims(sim_id) ON DELETE SET NULL;

ALTER TABLE generations
    ADD CONSTRAINT fk_generations_heir
    FOREIGN KEY (heir_id) REFERENCES sims(sim_id) ON DELETE SET NULL;


-- ============================================================================
-- JUNCTION / RELATIONSHIP TABLES
-- ============================================================================

-- Traits assigned to sims
CREATE TABLE sim_traits (
    sim_id UUID NOT NULL REFERENCES sims(sim_id) ON DELETE CASCADE,
    trait_id UUID NOT NULL REFERENCES traits(trait_id) ON DELETE CASCADE,
    acquired_date DATE,
    trait_slot trait_slot NOT NULL DEFAULT '1',
    PRIMARY KEY (sim_id, trait_id)
);

COMMENT ON TABLE sim_traits IS 'Traits assigned to each sim, including slot position';

CREATE INDEX idx_sim_traits_trait_id ON sim_traits(trait_id);

-- Skills learned by sims
CREATE TABLE sim_skills (
    sim_id UUID NOT NULL REFERENCES sims(sim_id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(skill_id) ON DELETE CASCADE,
    current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level >= 1),
    is_maxed BOOLEAN NOT NULL DEFAULT FALSE,
    maxed_date DATE,
    PRIMARY KEY (sim_id, skill_id)
);

COMMENT ON TABLE sim_skills IS 'Skill levels for each sim';

CREATE INDEX idx_sim_skills_skill_id ON sim_skills(skill_id);

-- Aspirations pursued by sims
CREATE TABLE sim_aspirations (
    sim_id UUID NOT NULL REFERENCES sims(sim_id) ON DELETE CASCADE,
    aspiration_id UUID NOT NULL REFERENCES aspirations(aspiration_id) ON DELETE CASCADE,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completion_date DATE,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (sim_id, aspiration_id)
);

COMMENT ON TABLE sim_aspirations IS 'Aspirations assigned to or completed by each sim';

CREATE INDEX idx_sim_aspirations_aspiration_id ON sim_aspirations(aspiration_id);

-- Career history for sims
CREATE TABLE sim_careers (
    sim_career_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sim_id UUID NOT NULL REFERENCES sims(sim_id) ON DELETE CASCADE,
    career_id UUID NOT NULL REFERENCES careers(career_id) ON DELETE CASCADE,
    branch_id UUID REFERENCES career_branches(branch_id) ON DELETE SET NULL,
    current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level >= 1),
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completion_date DATE,
    is_current BOOLEAN NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE sim_careers IS 'Career assignments and progress for each sim';

CREATE INDEX idx_sim_careers_sim_id ON sim_careers(sim_id);
CREATE INDEX idx_sim_careers_career_id ON sim_careers(career_id);
CREATE INDEX idx_sim_careers_branch_id ON sim_careers(branch_id);

-- Relationships between sims
CREATE TABLE relationships (
    relationship_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sim_id_1 UUID NOT NULL REFERENCES sims(sim_id) ON DELETE CASCADE,
    sim_id_2 UUID NOT NULL REFERENCES sims(sim_id) ON DELETE CASCADE,
    relationship_type relationship_type NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    started_date DATE,
    ended_date DATE,
    CHECK (sim_id_1 <> sim_id_2) -- prevent self-relationships
);

COMMENT ON TABLE relationships IS 'Relationships between pairs of sims';

CREATE INDEX idx_relationships_sim_id_1 ON relationships(sim_id_1);
CREATE INDEX idx_relationships_sim_id_2 ON relationships(sim_id_2);
CREATE INDEX idx_relationships_type ON relationships(relationship_type);

-- Goals for each generation
CREATE TABLE generation_goals (
    goal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generation_id UUID NOT NULL REFERENCES generations(generation_id) ON DELETE CASCADE,
    goal_text TEXT NOT NULL,
    is_optional BOOLEAN NOT NULL DEFAULT FALSE,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completion_date DATE,
    completed_by_sim_id UUID REFERENCES sims(sim_id) ON DELETE SET NULL
);

COMMENT ON TABLE generation_goals IS 'Specific goals/challenges for each generation';

CREATE INDEX idx_generation_goals_generation_id ON generation_goals(generation_id);

-- Required traits for each generation
CREATE TABLE generation_required_traits (
    generation_id UUID NOT NULL REFERENCES generations(generation_id) ON DELETE CASCADE,
    trait_id UUID NOT NULL REFERENCES traits(trait_id) ON DELETE CASCADE,
    trait_order INTEGER NOT NULL CHECK (trait_order BETWEEN 1 AND 3),
    PRIMARY KEY (generation_id, trait_id)
);

COMMENT ON TABLE generation_required_traits IS 'Traits required by the legacy challenge rules for each generation';

-- Required careers for each generation
CREATE TABLE generation_required_careers (
    generation_id UUID NOT NULL REFERENCES generations(generation_id) ON DELETE CASCADE,
    career_id UUID NOT NULL REFERENCES careers(career_id) ON DELETE CASCADE,
    branch_id UUID REFERENCES career_branches(branch_id) ON DELETE SET NULL,
    PRIMARY KEY (generation_id, career_id)
);

COMMENT ON TABLE generation_required_careers IS 'Careers required by the legacy challenge rules for each generation';

-- Life events timeline
CREATE TABLE life_events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sim_id UUID NOT NULL REFERENCES sims(sim_id) ON DELETE CASCADE,
    event_type life_event_type NOT NULL,
    event_date DATE NOT NULL,
    description TEXT,
    related_sim_id UUID REFERENCES sims(sim_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE life_events IS 'Timeline of significant events for each sim';
COMMENT ON COLUMN life_events.related_sim_id IS 'Another sim involved in the event (e.g., marriage partner, newborn)';

CREATE INDEX idx_life_events_sim_id ON life_events(sim_id);
CREATE INDEX idx_life_events_event_type ON life_events(event_type);
CREATE INDEX idx_life_events_event_date ON life_events(event_date);
CREATE INDEX idx_life_events_related_sim_id ON life_events(related_sim_id);

-- Collection completion tracking at the legacy level
CREATE TABLE legacy_collections (
    legacy_id UUID NOT NULL REFERENCES legacies(legacy_id) ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES collections(collection_id) ON DELETE CASCADE,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completion_date DATE,
    PRIMARY KEY (legacy_id, collection_id)
);

COMMENT ON TABLE legacy_collections IS 'Track which collections have been completed across the legacy';

-- Individual collection items found
CREATE TABLE legacy_collection_items (
    legacy_id UUID NOT NULL REFERENCES legacies(legacy_id) ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES collections(collection_id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES collection_items(item_id) ON DELETE CASCADE,
    found_date DATE,
    found_by_sim_id UUID REFERENCES sims(sim_id) ON DELETE SET NULL,
    PRIMARY KEY (legacy_id, item_id)
);

COMMENT ON TABLE legacy_collection_items IS 'Track individual collectible items found during the legacy';

CREATE INDEX idx_legacy_collection_items_collection_id ON legacy_collection_items(collection_id);
CREATE INDEX idx_legacy_collection_items_found_by ON legacy_collection_items(found_by_sim_id);


-- ============================================================================
-- BUSINESS LOGIC CONSTRAINTS
-- Enforce single-active rules via partial unique indexes
-- ============================================================================

-- Only one active generation per legacy at a time
CREATE UNIQUE INDEX idx_generations_unique_active
    ON generations(legacy_id) WHERE is_active = TRUE;

-- Only one current career per sim at a time
CREATE UNIQUE INDEX idx_sim_careers_unique_current
    ON sim_careers(sim_id) WHERE is_current = TRUE;

-- Only one current aspiration per sim at a time
CREATE UNIQUE INDEX idx_sim_aspirations_unique_current
    ON sim_aspirations(sim_id) WHERE is_current = TRUE;

-- Prevent duplicate directional relationships (enforce lower UUID first)
CREATE UNIQUE INDEX idx_relationships_unique_pair
    ON relationships(LEAST(sim_id_1, sim_id_2), GREATEST(sim_id_1, sim_id_2), relationship_type);

-- Additional query performance indexes
CREATE INDEX idx_sims_current_household ON sims(legacy_id) WHERE current_household = TRUE;
CREATE INDEX idx_generations_legacy_active ON generations(legacy_id, is_active);


-- ============================================================================
-- UPDATED_AT TRIGGER
-- Automatically update the updated_at column on row modification
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_legacies_updated_at
    BEFORE UPDATE ON legacies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_generations_updated_at
    BEFORE UPDATE ON generations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_sims_updated_at
    BEFORE UPDATE ON sims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
