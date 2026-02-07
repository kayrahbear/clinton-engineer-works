-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_users_email ON users(LOWER(email));

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Default admin user (password set via seed-admin-user script)
INSERT INTO users (user_id, email, password_hash, display_name)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@localhost',
    '$2a$12$placeholder_must_run_seed_script',
    'Admin'
);

-- Add user_id column to legacies
ALTER TABLE legacies
    ADD COLUMN user_id UUID REFERENCES users(user_id) ON DELETE CASCADE;

-- Assign all existing legacies to the default admin user
UPDATE legacies SET user_id = '00000000-0000-0000-0000-000000000001';

-- Make user_id NOT NULL after backfill
ALTER TABLE legacies ALTER COLUMN user_id SET NOT NULL;

-- Index for querying legacies by user
CREATE INDEX idx_legacies_user_id ON legacies(user_id);
