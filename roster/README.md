# Roster — editable source data

Two CSVs you can open in Excel/Google Sheets, edit, and send back. I'll turn the
edited versions into the database seed and re-load it.

## people.csv — everyone in the directory
One row per person (or open seat). This drives the assignee search and the records.

| Column | What to put |
|---|---|
| `region` | Florida / Georgia / North Carolina / Virginia (blank for Corporate) |
| `property` | Property name, `Corporate`, or `Region-wide` (for regional managers) |
| `name` | Person's full name. Leave blank for an open/vacant seat. |
| `title_or_function` | e.g. Property Manager, Leasing, Maintenance (Supervisor EPA), Groundskeeper |
| `email` | Their email. Blank if none. |
| `can_log_in` | `Yes` if they should be able to sign into the app, else `No` |
| `access_role` | For `Yes` only: Super Admin / Regional Manager / Property Manager / Assistant PM / Staff / Read-only |
| `status` | `Active` or `Vacant` |
| `notes` | Anything (e.g. "personal email — contact only") |

**To remove someone:** delete their row.
**To add someone:** add a row.
**Corporate people (you, Steve, Jackie, etc.)** are at the top — edit titles/emails as needed.

## role_mailboxes.csv — the per-property routing inboxes
The shared mailbox each property/function uses for task pings. Fill in blanks
where it says `confirm` / `TBD`, or correct addresses.

## When you're done
Save both files (keep them as CSV) and tell me — I'll regenerate the seed,
re-load the database, and (if you want) make corporate people show up in the
assignee search too.
