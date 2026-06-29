// Cadence / due-date logic for the ping engine (CLAUDE.md §7). Server-only.
//
// "Due today" is evaluated on the America/New_York CALENDAR day, so a task pings
// on the right morning regardless of the exact UTC minute the cron fires. A task
// is due when it has never been pinged, or when its last ping date + the cadence
// interval has arrived.
import "server-only";

export const CADENCE_DAYS = {
  daily: 1,
  every_2_days: 2,
  every_3_days: 3,
  weekly: 7,
} as const;

export type PingCadence = keyof typeof CADENCE_DAYS;

// SQL predicate over a `tasks t` row: true when the task is due to ping today
// (ET). Pair with `is_complete = false and recipient_email is not null`.
export const DUE_SQL = `(
  t.last_ping_at is null
  or (t.last_ping_at at time zone 'America/New_York')::date
     + (case t.cadence
          when 'daily' then 1
          when 'every_2_days' then 2
          when 'every_3_days' then 3
          when 'weekly' then 7
        end)
     <= (now() at time zone 'America/New_York')::date
)`;
