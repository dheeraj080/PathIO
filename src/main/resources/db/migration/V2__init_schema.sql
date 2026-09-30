-- Create table for tracking distributed sequence segments
CREATE TABLE IF NOT EXISTS id_generator (
    sequence_name VARCHAR(64) NOT NULL,
    next_id       BIGINT      NOT NULL DEFAULT 1,
    step          INT         NOT NULL DEFAULT 10000,
    description   VARCHAR(256),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_id_generator PRIMARY KEY (sequence_name),
    CONSTRAINT chk_40bit_limit CHECK (next_id <= 1099511627775)
);

-- Seed initial row for the 'url_sequence'
INSERT INTO id_generator (sequence_name, next_id, step, description)
VALUES ('url_sequence', 1, 10000, 'Sequence generator for pathio URL shortener IDs')
ON CONFLICT (sequence_name) DO NOTHING;

-- Database safety net: Enforce uniqueness at DB level in case of app layer bypass
CREATE UNIQUE INDEX IF NOT EXISTS ux_url_short_code ON url_entity (short_code);