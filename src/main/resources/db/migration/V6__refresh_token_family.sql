-- SEC-05: token families for refresh-token rotation.
-- Group every rotated successor of one session into a single family so that a replayed,
-- superseded token can revoke the whole chain instead of only one row. Existing rows are
-- backfilled as their own family (non-destructive; honors current retention/session state).

ALTER TABLE refresh_token ADD COLUMN IF NOT EXISTS family_id UUID;

-- gen_random_uuid() is core in PostgreSQL 13+.
UPDATE refresh_token SET family_id = gen_random_uuid() WHERE family_id IS NULL;

ALTER TABLE refresh_token ALTER COLUMN family_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS refresh_token_family_id_idx ON refresh_token (family_id);