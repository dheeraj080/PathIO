-- Phase 6 (plan "API & Developer Experience"): user API keys.
--
-- Programmatic access is authenticated with a plaintext API key that the server never stores:
-- only its SHA-256 hex digest lives in `key_hash`, so a database dump leaks no usable keys and
-- lookups hit the unique index directly. Rows cascade away with their owning user.
--
-- The unique constraint doubles as the fast lookup index for key_hash; `user_id` gets its own
-- index for the "list my keys" path.

CREATE TABLE IF NOT EXISTS api_keys (
    id           BIGSERIAL    PRIMARY KEY,
    user_id      UUID         NOT NULL,
    name         VARCHAR(64)  NOT NULL,
    key_hash     VARCHAR(64)  NOT NULL,
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    expires_at   TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    CONSTRAINT fk_api_keys_user
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT uk_api_keys_key_hash UNIQUE (key_hash),
    CONSTRAINT chk_api_keys_key_sha256 CHECK (length(key_hash) = 64)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys (user_id);