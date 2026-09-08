CREATE DATABASE IF NOT EXISTS analytics;

CREATE TABLE analytics.url_clicks (
    short_code   String,
    clicked_at   DateTime64(3, 'UTC'),
    ip_address   IPv4,
    country      LowCardinality(String),
    city         String,
    user_agent   String,
    browser      LowCardinality(String),
    os           LowCardinality(String),
    device_type  LowCardinality(String),
    referrer     String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(clicked_at)
ORDER BY (short_code, clicked_at)
TTL toDateTime(clicked_at) + INTERVAL 1 YEAR;