-- schema.sql — canonical, human-readable snapshot of the database structure.
--
-- This is documentation of the CURRENT cumulative schema. The database is
-- actually built by the numbered files in db/migrations/ (applied by
-- scripts/apply-migrations.ts). When you add a migration, update this file to
-- match so it always reflects the live schema in one place.
--
-- As of Milestone 4, the schema below equals migrations 0001_init + 0002_audit_log.
-- (Tasks + ping_log arrive in M5/M6.)

create extension if not exists pgcrypto;
create extension if not exists citext;

-- RBAC role (CLAUDE.md §4a), ordered low → high = the property hierarchy (§5).
create type user_role as enum (
  'read_only',
  'staff',
  'assistant_property_manager',
  'property_manager',
  'regional_manager',
  'super_admin'
);

-- Assignable job function at a property (CLAUDE.md §4b).
create type job_function as enum (
  'property_manager',
  'assistant_property_manager',
  'leasing',
  'maintenance'
);

create table regions (
  id         text primary key,
  name       text not null unique,
  has_regional_manager   boolean not null default true,
  regional_manager_email citext,
  created_at timestamptz not null default now()
);

create table properties (
  id         text primary key,
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

create table directory_people (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  property_id   text references properties(id) on delete cascade,
  region_id     text references regions(id) on delete set null,
  function      text not null default '',
  contact_email citext,
  is_vacant     boolean not null default false,
  created_at    timestamptz not null default now()
);
create index directory_people_property_idx on directory_people (property_id);
create index directory_people_name_idx on directory_people (lower(full_name));

create table users (
  id               uuid primary key default gen_random_uuid(),
  clerk_id         text unique,
  email            citext not null unique,
  full_name        text,
  role             user_role not null default 'read_only',
  can_manage_users boolean not null default false,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table email_allowlist (
  email      citext primary key,
  note       text,
  created_at timestamptz not null default now()
);

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

create table audit_log (
  id            bigint generated always as identity primary key,
  actor_user_id uuid references users(id) on delete set null,
  actor_email   citext,
  action        text not null,
  target_type   text,
  target_id     text,
  detail        jsonb,
  created_at    timestamptz not null default now()
);
create index audit_log_created_idx on audit_log (created_at desc);
create index audit_log_actor_idx on audit_log (actor_user_id);
create index audit_log_target_idx on audit_log (target_type, target_id);
