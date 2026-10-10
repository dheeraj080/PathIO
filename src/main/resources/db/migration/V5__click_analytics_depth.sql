-- V5: Click analytics depth — daily rollups and referrer/device breakdowns.
-- Unique clicks are tracked separately in Redis HyperLogLog (no PII, no schema needed).

CREATE TABLE click_rollup (
    click_date DATE         NOT NULL,
    short_code VARCHAR(32)  NOT NULL,
    clicks     BIGINT       NOT NULL DEFAULT 0,
    PRIMARY KEY (click_date, short_code)
);

CREATE INDEX IF NOT EXISTS idx_click_rollup_short_code ON click_rollup (short_code);

CREATE TABLE click_breakdown (
    click_date      DATE          NOT NULL,
    short_code      VARCHAR(32)   NOT NULL,
    dimension       VARCHAR(16)   NOT NULL,
    dimension_value VARCHAR(255)  NOT NULL,
    clicks          BIGINT        NOT NULL DEFAULT 0,
    PRIMARY KEY (click_date, short_code, dimension, dimension_value)
);

CREATE INDEX IF NOT EXISTS idx_click_breakdown_short_code ON click_breakdown (short_code, dimension);
