-- 0002_audit_log.sql — audit trail (Milestone 4).
--
-- Every sensitive WRITE (granting access, role/property/region changes,
-- activation) and sensitive READ (user list, a user's admin detail, the audit
-- log itself) is recorded here via lib/audit.writeAuditEntry. General navigation
-- is NOT logged (CLAUDE.md §12). Applied transactionally by apply-migrations.ts;
-- no BEGIN/COMMIT here.

create table audit_log (
  id            bigint generated always as identity primary key,
  -- Who acted. actor_email is denormalized so the trail survives even if the
  -- user row is later removed; actor_user_id is null for system actions.
  actor_user_id uuid references users(id) on delete set null,
  actor_email   citext,
  action        text not null,        -- dotted verb, e.g. 'user.role.update', 'admin.users.view'
  target_type   text,                 -- 'user', 'property_assignment', 'region_assignment', 'audit_log'
  target_id     text,                 -- id of the affected entity (text: ids are uuid or slug)
  detail        jsonb,                -- structured context (e.g. {"from":"read_only","to":"property_manager"})
  created_at    timestamptz not null default now()
);
create index audit_log_created_idx on audit_log (created_at desc);
create index audit_log_actor_idx on audit_log (actor_user_id);
create index audit_log_target_idx on audit_log (target_type, target_id);
