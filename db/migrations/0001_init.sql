-- 0001_init.sql — Cedar Grove Task Tracker, foundational schema (Milestone 1).
--
-- Scope: the reference/identity tables needed to seed the org and bootstrap
-- access — regions, properties, role mailboxes, the staff directory, login
-- users, the sign-up allowlist, and user→property/region assignments.
--
-- Deliberately NOT here yet (added in their own milestones to keep migrations
-- aligned to features): tasks + ping_log (M5/M6), audit_log (M4).
--
-- This file is applied by scripts/apply-migrations.ts inside a transaction; it
-- must NOT contain its own BEGIN/COMMIT. db/schema.sql mirrors the cumulative
-- result of all migrations for readability.

-- Extensions ----------------------------------------------------------------
create extension if not exists pgcrypto; -- gen_random_uuid()
create extension if not exists citext;   -- case-insensitive email columns

-- Enums ---------------------------------------------------------------------
-- RBAC role: what a user can SEE and DO (CLAUDE.md §4a). Higher roles inherit
-- lower-role permissions; the ordering here is the property hierarchy used by
-- the visibility rule (§5), low → high.
create type user_role as enum (
  'read_only',
  'staff',
  'assistant_property_manager',
  'property_manager',
  'regional_manager',
  'super_admin'
);

-- Job function: the assignable target at a property (CLAUDE.md §4b). Distinct
-- from RBAC role. Only these four route to a role mailbox.
create type job_function as enum (
  'property_manager',
  'assistant_property_manager',
  'leasing',
  'maintenance'
);

-- Regions -------------------------------------------------------------------
create table regions (
  id         text primary key,           -- stable slug, e.g. 'florida'
  name       text not null unique,        -- display name, e.g. 'Florida'
  -- NC structurally has no regional manager → escalations go to Geoff + Steve
  -- only (CLAUDE.md §7). This boolean captures "no RM exists" as distinct from
  -- "RM exists but we don't have their email yet" (VA), where the email is null.
  has_regional_manager   boolean not null default true,
  regional_manager_email citext,
  created_at timestamptz not null default now()
);

-- Properties ----------------------------------------------------------------
create table properties (
  id         text primary key,           -- stable slug, e.g. 'magnolia-point'
  name       text not null,
  region_id  text not null references regions(id),
  state      char(2) not null,
  city       text not null,
  units      integer,
  main_phone text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
create index properties_region_idx on properties (region_id);

-- Role mailboxes ------------------------------------------------------------
-- One row per (property, function). email may be null when the mailbox isn't
-- known yet (confirm with Geoff). A mailbox can receive pings with no human
-- user attached (CLAUDE.md §3). A single email may be shared across properties
-- (e.g. kingsparkpm@ serves Kings Tree + Park Place) — so email is NOT unique.
create table role_mailboxes (
  id          uuid primary key default gen_random_uuid(),
  property_id text not null references properties(id) on delete cascade,
  function    job_function not null,
  email       citext,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (property_id, function)
);
create index role_mailboxes_property_idx on role_mailboxes (property_id);

-- Staff directory -----------------------------------------------------------
-- Powers the assignee autocomplete (CLAUDE.md §6a) and records who holds each
-- function. These are NOT login accounts — many on-site staff never log in.
-- Seed-managed in M1 (rebuilt from SEED_DATA.md on each seed run).
create table directory_people (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  property_id   text references properties(id) on delete cascade,
  region_id     text references regions(id) on delete set null, -- for region-level people (RMs)
  function      text not null default '',   -- free text: 'maintenance (Supervisor, EPA)', etc.
  contact_email citext,                      -- contact only; NOT a login allowlist entry
  is_vacant     boolean not null default false, -- true for OPEN/Vacant seats
  created_at    timestamptz not null default now()
);
create index directory_people_property_idx on directory_people (property_id);
create index directory_people_name_idx on directory_people (lower(full_name));

-- Login users ---------------------------------------------------------------
-- Created on first Google sign-in via the Clerk webhook (M2). Seeded here only
-- for the super-admin bootstrap (otherwise no one could grant access). clerk_id
-- is null until first sign-in links the account by matching email.
-- Default-deny: role defaults to read_only with zero property assignments.
create table users (
  id               uuid primary key default gen_random_uuid(),
  clerk_id         text unique,
  email            citext not null unique,
  full_name        text,
  role             user_role not null default 'read_only',
  can_manage_users boolean not null default false, -- explicit capability (CLAUDE.md §4a)
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Sign-up allowlist ---------------------------------------------------------
-- The two Workspace domains self-register (enforced in auth, M2). Individual
-- outside-domain addresses must be explicitly listed here to sign in.
create table email_allowlist (
  email      citext primary key,
  note       text,
  created_at timestamptz not null default now()
);

-- Access assignments --------------------------------------------------------
-- Which properties / regions a user is granted. super_admin sees everything
-- without rows here; regional_manager via region; PM/APM/staff/read_only via
-- property. Read by getAllowedPropertyIds (lib/auth.ts, M3).
create table user_property_assignments (
  user_id     uuid not null references users(id) on delete cascade,
  property_id text not null references properties(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

create table user_region_assignments (
  user_id     uuid not null references users(id) on delete cascade,
  region_id   text not null references regions(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (user_id, region_id)
);
