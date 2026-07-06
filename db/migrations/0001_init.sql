-- Initial schema for the control plane's own Postgres database (Cloud SQL).
-- Consolidates what was previously built up incrementally against Supabase.
create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  is_admin boolean not null default false,
  password_hash text not null,
  pat_encrypted text not null,
  github_login text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Invites: admin-issued, one-time, token stored as a hash only.
create table invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  invited_by uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz
);

create unique index invites_pending_email_idx on invites (lower(email)) where accepted_at is null;
