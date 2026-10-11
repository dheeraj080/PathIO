-- Phase 6 (modular monolith): link's `urls` table no longer holds a database-level foreign key
-- into auth's `users` table. Cross-module references are by immutable identifier only, so the two
-- modules' schemas can evolve independently. `urls.user_id` itself is kept (nullable, indexed) as
-- a plain UUID column, so existing rows and ownership queries are unchanged.
--
-- The JPA side drops the matching `@ManyToOne User` association for the same reason: link code no
-- longer depends on auth entities at compile time.
--
-- Consequence: deleting a user no longer nulls the `user_id` of their URLs (the former
-- ON DELETE SET NULL behaviour of fk_urls_user). Links are only ever listed or scoped to the
-- current user, so an orphaned owner id is never exposed through the API.

ALTER TABLE urls DROP CONSTRAINT IF EXISTS fk_urls_user;
