ALTER TABLE sims
    ADD COLUMN is_generation_founder BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN generation_founder_id UUID REFERENCES generations(generation_id) ON DELETE SET NULL,
    ADD COLUMN generation_heir_id UUID REFERENCES generations(generation_id) ON DELETE SET NULL;

ALTER TABLE sims RENAME COLUMN is_founder TO is_legacy_founder;
ALTER TABLE sims RENAME COLUMN is_heir TO is_generation_heir;