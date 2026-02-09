-- Assign orphaned sims to the first generation of their legacy before restoring NOT NULL
UPDATE sims s
SET generation_id = (
  SELECT g.generation_id FROM generations g
  WHERE g.legacy_id = s.legacy_id
  ORDER BY g.generation_number ASC LIMIT 1
)
WHERE s.generation_id IS NULL;

DROP INDEX IF EXISTS idx_sims_is_townie;
ALTER TABLE sims ALTER COLUMN generation_id SET NOT NULL;
ALTER TABLE sims DROP COLUMN is_townie;
