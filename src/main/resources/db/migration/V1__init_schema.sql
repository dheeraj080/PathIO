-- Create table for tracking distributed sequence segments

CREATE TABLE IF NOT EXISTS id_generator (
    sequence_name VARCHAR(64) NOT NULL,
    next_id       BIGINT      NOT NULL DEFAULT 1,
    step          INT         NOT NULL DEFAULT 10000,
    description   VARCHAR(256),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_id_generator PRIMARY KEY (sequence_name),
    -- Ensure next_id does not exceed 41-bit constraint (2^41 - 1 = 2,199,023,255,551)
    CONSTRAINT chk_41bit_limit CHECK (next_id <= 2199023255551)
);

-- Seed initial row for the 'url_sequence'
INSERT INTO id_generator (sequence_name, next_id, step, description)
VALUES ('url_sequence', 1, 10000, 'Sequence generator for pathio URL shortener IDs')
ON CONFLICT (sequence_name) DO NOTHING;