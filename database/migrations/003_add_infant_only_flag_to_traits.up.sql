ALTER TABLE traits ADD COLUMN infant_only BOOLEAN;
ALTER TABLE traits ALTER COLUMN infant_only SET DEFAULT FALSE;
UPDATE traits SET infant_only = FALSE WHERE infant_only IS NULL;
ALTER TABLE traits ALTER COLUMN infant_only SET NOT NULL;