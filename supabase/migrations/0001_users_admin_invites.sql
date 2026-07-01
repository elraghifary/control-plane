-- Users: add email (login identifier) + admin flag. GitHub login (from PAT
-- validation) is the display handle — there is no separate username column.
alter table users
  add column email text,
  add column is_admin boolean not null default false;

update users set email = 'elra@happykids.id', is_admin = true where github_login = 'elraghifary';

alter table users
  alter column email set not null,
  add constraint users_email_key unique (email);

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
