-- 1. Create users table matching User.java
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY,
    user_email VARCHAR(255) UNIQUE,
    user_name VARCHAR(255),
    password VARCHAR(255),
    image TEXT,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_id VARCHAR(255)
);

-- 2. Create roles table matching Role.java
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

-- 3. Create user_roles join table matching User.java
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- 4. Create refresh_token table matching RefreshToken.java
CREATE TABLE IF NOT EXISTS refresh_token (
    jti                VARCHAR(64)  PRIMARY KEY,
    user_id            UUID         NOT NULL,
    created_at         TIMESTAMPTZ  NOT NULL,
    expires_at         TIMESTAMPTZ  NOT NULL,
    revoked            BOOLEAN      NOT NULL DEFAULT FALSE,
    replaced_by_token  VARCHAR(64),
    revoked_at         TIMESTAMPTZ,
    CONSTRAINT fk_refresh_token_user
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS refresh_token_user_id_idx
    ON refresh_token (user_id);

-- 5. Create urls table matching UrlEntity.java
CREATE TABLE IF NOT EXISTS urls (
    id BIGSERIAL PRIMARY KEY,
    long_url VARCHAR(2048) NOT NULL,
    short_code VARCHAR(7) NOT NULL UNIQUE,
    click_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL
);

-- 6. Create id_generator table
CREATE TABLE IF NOT EXISTS id_generator (
    sequence_name VARCHAR(64) NOT NULL,
    next_id BIGINT NOT NULL DEFAULT 1,
    step INT NOT NULL DEFAULT 10000,
    description VARCHAR(256),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_id_generator PRIMARY KEY (sequence_name),
    CONSTRAINT chk_41bit_limit CHECK (next_id <= 2199023255551)
);

-- Seed initial row
INSERT INTO id_generator (sequence_name, next_id, step, description)
VALUES ('url_sequence', 1, 10000, 'Sequence generator for pathio URL shortener IDs')
ON CONFLICT (sequence_name) DO NOTHING;