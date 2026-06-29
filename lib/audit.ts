// SECURITY-CRITICAL (CLAUDE.md §12). Server-only.
//
// The single entry point for the audit trail. All sensitive writes and reads in
// the admin area call writeAuditEntry. Keep this dependency-light and never let
// an audit failure silently swallow the action it describes — callers that must
// not proceed without an audit record should await it (the default).
import "server-only";
import type { PoolClient } from "pg";
import { query } from "./db";

export type AuditEntry = {
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string; // dotted verb, e.g. "user.role.update", "admin.users.view"
  targetType?: string | null;
  targetId?: string | null;
  detail?: unknown; // structured context; stored as jsonb
};

const INSERT = `insert into audit_log
    (actor_user_id, actor_email, action, target_type, target_id, detail)
  values ($1, $2, $3, $4, $5, $6)`;

function params(entry: AuditEntry): unknown[] {
  return [
    entry.actorUserId ?? null,
    entry.actorEmail ?? null,
    entry.action,
    entry.targetType ?? null,
    entry.targetId ?? null,
    entry.detail === undefined || entry.detail === null ? null : JSON.stringify(entry.detail),
  ];
}

// Write an audit row. Pass a transaction `client` to record the entry inside the
// same transaction as the change it describes (all-or-nothing).
export async function writeAuditEntry(entry: AuditEntry, client?: PoolClient): Promise<void> {
  if (client) {
    await client.query(INSERT, params(entry));
  } else {
    await query(INSERT, params(entry));
  }
}
