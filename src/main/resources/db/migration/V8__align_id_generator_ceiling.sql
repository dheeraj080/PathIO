-- IDG-01: align the id_generator ceiling with the application's 40-bit ID space.
--
-- The Java allocation path caps every fetched range at (2^40 - 1) = 1099511627775 to
-- match the Feistel obfuscator (two 20-bit halves) and the 7-character Base62 envelope.
-- The former 41-bit CHECK could never fire (allocation throws first) and implied a wider
-- space than the pipeline supports; replace it with the effective 40-bit limit so the
-- database constraint documents the real bound and matches the code behind it.
--
-- Additive policy: only the CHECK constraint changes; no row can ever exceed the ceiling,
-- so dropping and re-adding the constraint touches no data.

ALTER TABLE id_generator DROP CONSTRAINT IF EXISTS chk_41bit_limit;

ALTER TABLE id_generator
    ADD CONSTRAINT chk_40bit_limit CHECK (next_id <= 1099511627775);