CREATE KEYSPACE pathio_shortener
    WITH replication = {'class': 'NetworkTopologyStrategy', 'datacenter1': 3};

USE url_shortener;

-- Primary URL Mapping Table
CREATE TABLE short_urls (
                            short_code   text,          -- Base62 unique key (e.g., 'aX9kL2')
                            original_url text,          -- Target destination URL
                            user_id      bigint,        -- User who created the link (0 if anonymous)
                            domain       text,          -- Domain name used ('default' or custom)
                            created_at   timestamp,     -- Creation timestamp
                            expires_at   timestamp,     -- Optional TTL/Expiration
                            is_active    boolean,       -- Kill switch flag
                            PRIMARY KEY (short_code)
) WITH bloom_filter_fp_chance = 0.01; -- Optimizes non-existent key lookups