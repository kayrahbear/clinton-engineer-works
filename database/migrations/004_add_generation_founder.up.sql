-- Add founder_id to generations table
-- The founder is the sim who leads this generation (was the heir of the previous generation)
ALTER TABLE generations
  ADD COLUMN founder_id UUID REFERENCES sims(sim_id);

CREATE INDEX idx_generations_founder_id ON generations(founder_id);
