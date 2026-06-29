-- 0003_tasks.sql — tasks + ping log (Milestone 5).
--
-- Each row in `tasks` is ONE instance. Assigning to a function at multiple
-- properties fans out into multiple instances sharing an origin_id (CLAUDE.md
-- §6b); each is tracked and completed independently. All cycle-time fields are
-- captured from creation (§8) so reporting (M7) needs no backfill. ping_log is
-- populated by the M6 engine but created here as part of the task data model.

create type task_priority as enum ('low', 'medium', 'high');
create type ping_cadence as enum ('daily', 'every_2_days', 'every_3_days', 'weekly');

create table tasks (
  id        uuid primary key default gen_random_uuid(),
  -- Groups fan-out siblings ("this directive went to 3 sites"). Equals the
  -- instance's own id for a single-target task.
  origin_id uuid not null,

  title     text not null,
  notes     text,
  priority  task_priority not null default 'medium',
  cadence   ping_cadence  not null default 'daily',
  escalation_threshold integer not null default 3, -- ping count before escalation (§6a)

  -- Scope. property_id null = corporate/standalone (sits outside the property
  -- chain). region_id is denormalized from the property at creation for reporting.
  property_id  text references properties(id),
  region_id    text references regions(id),
  job_function job_function, -- set when the target was a role@property; null for person/email/standalone

  -- Recipient, resolved at creation.
  assignee_label  text not null,  -- display: "Leasing @ Cielo @ 325", a person, or an email
  recipient_email citext,         -- where pings go; null if the role mailbox is unknown

  -- Lifecycle + cycle-time capture (§8).
  created_by   uuid not null references users(id),
  created_at   timestamptz not null default now(),
  completed_at timestamptz,
  completed_by uuid references users(id),
  -- Source of truth is completed_at; is_complete is derived so it can't drift.
  is_complete  boolean generated always as (completed_at is not null) stored,
  escalated_at timestamptz,
  last_ping_at timestamptz,
  ping_count   integer not null default 0,
  updated_at   timestamptz not null default now()
);
create index tasks_origin_idx on tasks (origin_id);
create index tasks_property_idx on tasks (property_id);
create index tasks_region_idx on tasks (region_id);
create index tasks_open_idx on tasks (is_complete) where is_complete = false;
create index tasks_recipient_idx on tasks (recipient_email);
create index tasks_created_by_idx on tasks (created_by);

create table ping_log (
  id        bigint generated always as identity primary key,
  task_id   uuid not null references tasks(id) on delete cascade,
  recipient citext,
  sent_at   timestamptz not null default now()
);
create index ping_log_task_idx on ping_log (task_id);
create index ping_log_sent_idx on ping_log (sent_at);
