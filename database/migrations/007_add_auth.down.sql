DROP INDEX IF EXISTS idx_legacies_user_id;
ALTER TABLE legacies DROP COLUMN IF EXISTS user_id;
DROP INDEX IF EXISTS idx_refresh_tokens_expires_at;
DROP INDEX IF EXISTS idx_refresh_tokens_token_hash;
DROP INDEX IF EXISTS idx_refresh_tokens_user_id;
DROP TABLE IF EXISTS refresh_tokens;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP INDEX IF EXISTS idx_users_email;
DROP TABLE IF EXISTS users;
