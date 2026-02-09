-- Add townie flag and make generation_id optional for townies
ALTER TABLE sims ADD COLUMN is_townie BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sims ALTER COLUMN generation_id DROP NOT NULL;
CREATE INDEX idx_sims_is_townie ON sims (is_townie) WHERE is_townie = TRUE;
