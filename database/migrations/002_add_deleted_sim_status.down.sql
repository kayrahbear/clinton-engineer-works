-- Revert 'deleted' from sim_status enum
-- PostgreSQL doesn't support removing enum values directly.
-- To fully revert, you'd need to:
-- 1. Update any rows using 'deleted' status to another status
-- 2. Recreate the enum without 'deleted'
-- 3. Alter all columns using the enum to the new type
--
-- For safety, this down migration only clears the 'deleted' status from sims.
-- The enum value remains but is unused.

UPDATE sims SET status = 'moved_out' WHERE status = 'deleted';
