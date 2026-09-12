CREATE TABLE users (
    user_id       BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    api_key       VARCHAR(64) UNIQUE,
    created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE custom_domains (
    domain_id   BIGSERIAL PRIMARY KEY,
    user_id     BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
    domain_name VARCHAR(255) UNIQUE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);