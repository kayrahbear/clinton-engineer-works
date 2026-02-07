-- Create milestones reference table
CREATE TABLE IF NOT EXISTS milestones (
    milestone_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    milestone_name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('fine_motor', 'gross_motor', 'cognitive', 'motor', 'firsts', 'life', 'social')),
    min_age_group TEXT NOT NULL CHECK (min_age_group IN ('infant', 'toddler', 'child', 'teen', 'young_adult', 'adult', 'elder')),
    max_age_group TEXT CHECK (max_age_group IN ('infant', 'toddler', 'child', 'teen', 'young_adult', 'adult', 'elder')),
    pack_required TEXT NOT NULL,
    icon_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (milestone_name, min_age_group, max_age_group)
);

-- Create junction table for sim milestones
CREATE TABLE IF NOT EXISTS sim_milestones (
    sim_id UUID REFERENCES sims(sim_id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES milestones(milestone_id) ON DELETE CASCADE,
    achieved_date DATE NOT NULL DEFAULT CURRENT_DATE,
    related_sim_id UUID REFERENCES sims(sim_id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (sim_id, milestone_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_milestones_category ON milestones(category);
CREATE INDEX IF NOT EXISTS idx_milestones_min_age ON milestones(min_age_group);
CREATE INDEX IF NOT EXISTS idx_milestones_pack ON milestones(pack_required);
CREATE INDEX IF NOT EXISTS idx_sim_milestones_sim_id ON sim_milestones(sim_id);
CREATE INDEX IF NOT EXISTS idx_sim_milestones_achieved_date ON sim_milestones(achieved_date);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_milestones_updated_at ON milestones;
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON milestones
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
