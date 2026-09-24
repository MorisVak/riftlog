-- No profile pictures of any kind. Every account renders the same default
-- avatar client-side, so there is nothing to store — and no provider image URL
-- (Discord/Google `avatar_url`/`picture`) is read or retained. The seed
-- trigger stopped writing this column in 20260924151001_profile_identity.sql.
alter table public.profiles drop column avatar_url;
