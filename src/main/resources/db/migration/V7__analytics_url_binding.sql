-- DB-01: Bind click analytics to the immutable url record id instead of the reusable short_code.
--
-- Short codes are user-choosable aliases that can be re-registered after their URL is deleted.
-- Analytics keyed only by short_code would leak the previous owner's history to whoever next
-- claims the same alias. Rows are now tied to urls.id and cascade away when the URL is deleted.
--
-- Orphan records (short_code no longer present in urls) belong to already-deleted URLs; per the
-- retention policy "analytics follow the URL" they are removed explicitly rather than kept as
-- unowned rows.

-- 1. Add nullable url_id so the backfill can run against the existing rows.
ALTER TABLE click_rollup ADD COLUMN IF NOT EXISTS url_id BIGINT;
ALTER TABLE click_breakdown ADD COLUMN IF NOT EXISTS url_id BIGINT;

-- 2. Backfill from the surviving URLs (short_code is UNIQUE on urls, so the join is 1:1).
UPDATE click_rollup cr
   SET url_id = u.id
  FROM urls u
 WHERE u.short_code = cr.short_code
   AND cr.url_id IS NULL;

UPDATE click_breakdown cb
   SET url_id = u.id
  FROM urls u
 WHERE u.short_code = cb.short_code
   AND cb.url_id IS NULL;

-- 3. Orphan rows: their parent URL is gone and can never be owned again; drop them explicitly.
DELETE FROM click_rollup WHERE url_id IS NULL;
DELETE FROM click_breakdown WHERE url_id IS NULL;

-- 4. Enforce the binding and cascade analytics deletion with the URL row.
ALTER TABLE click_rollup ALTER COLUMN url_id SET NOT NULL;
ALTER TABLE click_breakdown ALTER COLUMN url_id SET NOT NULL;

ALTER TABLE click_rollup
    ADD CONSTRAINT fk_click_rollup_url
    FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE;

ALTER TABLE click_breakdown
    ADD CONSTRAINT fk_click_breakdown_url
    FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_click_rollup_url_id ON click_rollup (url_id);
CREATE INDEX IF NOT EXISTS idx_click_breakdown_url_id ON click_breakdown (url_id);