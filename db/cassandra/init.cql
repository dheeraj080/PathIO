CREATE KEYSPACE IF NOT EXISTS url_shortener
    WITH replication = {'class': 'NetworkTopologyStrategy', 'datacenter1': 3};

USE url_shortener;

CREATE TABLE IF NOT EXISTS short_urls (
                                          short_code   text,
                                          original_url text,
                                          user_id      bigint,
                                          domain       text,
                                          created_at   timestamp,
                                          expires_at   timestamp,
                                          is_active    boolean,
                                          PRIMARY KEY (short_code)
) WITH bloom_filter_fp_chance = 0.01;