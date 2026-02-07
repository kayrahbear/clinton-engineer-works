-- Restore original column names before dropping added columns
ALTER TABLE sims RENAME COLUMN is_legacy_founder TO is_founder;
ALTER TABLE sims RENAME COLUMN is_generation_heir TO is_heir;

ALTER TABLE sims
  DROP COLUMN is_generation_founder,
  DROP COLUMN generation_founder_id,
  DROP COLUMN generation_heir_id;
