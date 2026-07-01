-- BACKEND_SCHEMA.md §7 — device_tokens table for Expo Push notifications.
-- One user can have many tokens (multiple devices). Token registration is
-- client-side: the app upserts on login; the Edge Function reads to deliver
-- push. Deletion on sign-out or permission revocation is client-driven.
create table device_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  expo_token  text not null,
  platform    text check (platform in ('ios', 'android')),
  created_at  timestamptz default now(),
  unique (user_id, expo_token)
);

alter table device_tokens enable row level security;

-- Users may read, insert, and delete their own tokens; no update (just
-- re-insert if token rotates). Service role (Edge Functions) reads all.
create policy "own tokens - select" on device_tokens
  for select using (auth.uid() = user_id);
create policy "own tokens - insert" on device_tokens
  for insert with check (auth.uid() = user_id);
create policy "own tokens - delete" on device_tokens
  for delete using (auth.uid() = user_id);

create index device_tokens_user on device_tokens(user_id);
