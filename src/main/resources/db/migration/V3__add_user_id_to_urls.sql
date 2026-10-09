-- V3: Add nullable user_id foreign key to urls table for authenticated URL ownership

ALTER TABLE urls
    ADD COLUMN IF NOT EXISTS user_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_urls_user'
    ) THEN
        ALTER TABLE urls
            ADD CONSTRAINT fk_urls_user
            FOREIGN KEY (user_id) REFERENCES users(user_id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_urls_user_id ON urls(user_id);
