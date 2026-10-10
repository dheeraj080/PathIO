-- V4: Widen short_code to support custom aliases (1-32 chars, [a-zA-Z0-9_-])
-- Generated codes remain 7-char Base62; aliases may be up to 32 characters.

ALTER TABLE urls
    ALTER COLUMN short_code TYPE VARCHAR(32);
