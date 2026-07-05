-- Neon Postgres schema for invoice-generator.
-- Run this once against your Neon database (SQL editor or psql).

create table if not exists users (
  id            text primary key,        -- random uid
  email         text not null unique,    -- lowercased login email
  name          text,
  password_hash text not null,           -- bcrypt hash
  created_at    timestamptz not null default now()
);

create table if not exists invoices (
  id         text primary key,           -- client-generated uid (SavedInvoice.id)
  user_id    text not null references users(id) on delete cascade,
  data       jsonb not null,             -- full InvoiceData blob
  status     text  not null default 'draft'
             check (status in ('draft', 'sent', 'paid')),
  updated_at bigint not null,            -- epoch ms, matches SavedInvoice.updatedAt
  deleted_at timestamptz                 -- soft delete; null = live
);

create index if not exists invoices_user_id_idx on invoices (user_id);

-- Rate limiting for auth endpoints. One row per (key, attempted-at); we count
-- recent rows in a sliding window. `key` is e.g. "login:<ip>" or "signup:<ip>".
create table if not exists auth_attempts (
  id      bigint generated always as identity primary key,
  key     text        not null,
  at      timestamptz not null default now()
);

create index if not exists auth_attempts_key_at_idx on auth_attempts (key, at);
