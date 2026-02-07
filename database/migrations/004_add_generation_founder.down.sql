DROP INDEX IF EXISTS idx_generations_founder_id;
ALTER TABLE generations DROP COLUMN IF EXISTS founder_id;
