# Cedar Grove · Task Tracker — Project Brief

> This file is the single source of truth for the build. Any Claude Code
> session must read it end-to-end before suggesting or writing code.
> Companion file: `SEED_DATA.md` (real properties, regions, staff, role
> mailboxes — the first migration is built from it).

---

## 1. What this app is

An internal, staff-only task tracker for Cedar Grove Capital and its management
company, Covenant Property Services. The core loop:

1. Someone **creates a task** (title, notes, priority, ping cadence) and assigns
   it to one or more targets (a role at a property, a chosen email, or a named
   person).
2. The system **pings the assignee(s) by email on the chosen cadence** until the
   task is marked complete. Everyone with multiple open tasks gets **one
   consolidated email**, with a link into the interface.
3. When a task is **toggled complete**, the original creator is notified.
4. Tasks that stay open past a threshold **escalate** by email to the property's
   regional manager plus Geoff and Steve.
5. All task history (timestamps, pings, time-to-complete) is **captured for later
   reporting** so the team can establish best practices.

This is a task tool, NOT the property-reporting dashboard described in
`cedar-grove-dashboard-scoping_1.md`. That is a separate, larger project. Do not
pull lead, application, renewal, delinquency, or any tenant/resident data into
this app. See §11 (scope).

### Lineage

This supersedes two earlier prototypes:
- The deprecated two-person task tracker (Vercel/Resend, single shared password).
- The empty `cedar-grove-tasks` scaffold (Render/Clerk, RBAC, default-deny).

This build is the second one done properly, **with the ping/digest/escalation
engine brought back in** (that engine was explicitly out-of-scope in the old
scaffold; here it is in scope).

---

## 2. Who this is for

**Geoff Girnun (VP Operations & Asset Manager)** directs this build and is the
primary point of contact. **Geoff is not a developer.** When working with him:

- Define every technical term the first time it appears.
- Explain tradeoffs in plain language: the options, and why one was chosen.
- Flag anything touching security, compliance, or data privacy.
- Build **incrementally**. After each milestone, **STOP** and let Geoff test the
  staging deploy before starting the next. Do not batch milestones.
- **Never ask him to paste a secret** (API key, DB URL, password) into chat.
  Send him to the Render dashboard, Clerk dashboard, or `.env.local`, and use
  commands like `openssl rand -hex 32` so secrets stay on his machine.

Workflow Geoff has chosen: develop and test locally first (local dev server in
the browser), then deploy to a Render staging service, then promote to
production.

---

## 3. Organizations, domains, and login

Two related companies, both on Google Workspace:

| Org | Domain | Who |
|---|---|---|
| Cedar Grove Capital Partners (ownership) | `@cedargrovecp.com` | Geoff, Steve + corporate |
| Covenant Property Services (management LLC) | `@covenantpropertyservices.com` | Regional/property managers, leasing, maintenance, corporate ops |

**Login = Google sign-in (via Clerk).** Both domains **self-register**: anyone
with a Workspace account on either domain can sign in. Outside those two domains,
login is **invitation-only** by explicit email allowlist.

**Named outside-domain exceptions (allowlisted individuals):**
- `aarongorin@gmail.com` (Aaron Gorin, founder — personal Gmail).
- River Edge Advisors: `<prefix>@riveredgeadvisors.com` — invited individuals
  only. Seed the specific addresses at deploy time (placeholder in `SEED_DATA.md`).

**Default-deny is non-negotiable.** Every new sign-in — regardless of domain —
lands as `read_only` with **zero property assignments**, so it sees nothing until
a super admin grants access. This makes open self-registration safe: access is
empty until provisioned, which contains the blast radius of a leaked credential.

**Login vs. ping recipient — important distinction.** Many on-site staff
(maintenance techs, groundskeepers) have **no company email** and will never log
in. They are still valid **ping recipients** via the property role mailbox (e.g.
`magnoliapointleasing@...`). So: *having an account* (can log in) and *receiving
task pings* (gets the email) are two different things. The data model must allow
a role mailbox to receive pings even when no human user is attached to it.

---

## 4. Roles (RBAC) vs. job functions (assignment)

These are two different axes. Do not conflate them.

### 4a. RBAC role — what a user can SEE and DO

Stored as a Postgres enum. Higher roles inherit lower-role permissions.

| Role | Sees | Can do |
|---|---|---|
| `super_admin` | Everything | Everything, incl. user/role/property management. Seed: Geoff, Steve, Aaron. |
| `regional_manager` | All properties in their region | Create/edit/assign tasks within their region. No user mgmt. |
| `property_manager` | Their assigned property/properties | Create/edit/assign tasks for their property; see all tasks at it (incl. leasing/maintenance/APM). |
| `assistant_property_manager` | Their assigned property | Create/edit tasks; see property tasks. Below PM. |
| `staff` (leasing, maintenance) | Their assigned property | View their own tasks, toggle complete, add notes. Cannot create or reassign. |
| `read_only` | Assigned properties (none by default) | View only. **Default for every new sign-up, with no property assignments.** |

**Users who can grant access / manage users** (a permission, effectively
super-admin-grade for user management): Geoff, Steve, Aaron, **Cara, Jackie**.
Cara and Jackie get user-management rights without necessarily being full
`super_admin` over all task data — model this as an explicit
`can_manage_users` capability rather than overloading the role enum, OR seed them
as `super_admin`; flag the tradeoff to Geoff and let him choose.

### 4b. Job function — the assignment target / which mailbox a task routes to

The set of assignable functions at a property:
`property_manager`, `assistant_property_manager`, `leasing`, `maintenance`.

Each property has up to four **role mailboxes**, one per function (some null,
some shared across properties — see `SEED_DATA.md`). A task assigned to
"Leasing @ Cielo" routes its pings to that property's leasing mailbox
(`cielo325leasing@...`) and is owned by whoever currently holds that function
there.

---

## 5. Visibility rule (the load-bearing one)

A property has a hierarchy: `staff` < `assistant_property_manager` <
`property_manager` < `regional_manager` < corporate / `super_admin`.

**A task is visible to, and completable by, the assignee AND everyone above the
assignee in that property's chain.** Concretely:

- A task to **Leasing @ Cielo** is seen by the Cielo leasing person, the Cielo
  APM, the Cielo PM, the GA regional manager, and corporate/super-admins.
- A PM sees every task at their property regardless of which function it was
  assigned to.
- A regional manager sees every task at every property in their region.
- Corporate / super-admins see everything.

**Completion authority:** the assignee can toggle complete, and so can anyone
above them in the chain (a PM can close out a leasing task that's done but the
agent forgot to toggle). Every toggle is audit-logged with who and when.

**Row-level enforcement:** every property-scoped query MUST filter by the
authenticated user's allowed property IDs via a single
`getAllowedPropertyIds(userId)` helper in `lib/auth.ts`. No raw property-scoped
query may bypass it. A code review that finds one blocks merge.

---

## 6. The task model

### 6a. Create-task form fields

- **Title** (required, short).
- **Notes** (free text, optional). *No tenant/resident PII — see §11.*
- **Assignee(s)** — one or more assignment targets. Each target is one of:
  - a **role at a property** (property + job function → resolves to role mailbox), or
  - a **specific named person** (resolves to their email), or
  - a **chosen email**, which **defaults to the matching role mailbox** when you
    pick a function (e.g. choosing "leasing" pre-fills `cielo325leasing@...` but
    can be overridden).
  - The assignee field is a **type-ahead autocomplete**: as you type a name it
    populates from the people/role directory (seeded from `SEED_DATA.md`).
- **Priority** — `low` | `medium` | `high`. A label and sort key only.
  **Independent of cadence** (do not couple them).
- **Ping cadence** — `daily` | `every_2_days` | `every_3_days` | `weekly`.
- **Escalation threshold** — number of pings before escalation. **Default 3.**
  (Note: this is a ping count, so actual elapsed time depends on cadence — e.g.
  an every-3-days task escalates after ~9 days = 3 pings. That coupling is
  intended and understood.)
- **Property/scope** — one or more properties, or **Corporate / standalone**
  (no property). Standalone tasks are visible to corporate/super-admins (and the
  assignee); they sit outside the property chain.

### 6b. Multi-property = fan-out

Assigning one task to, say, maintenance at three properties **creates three
independent task instances**, one per property. Each has its own pings,
completion, and cycle-time record, and closes on its own. They share an
`origin_id` so a report can show "this directive went to 3 sites: 2 complete, 1
open," but each instance is tracked and closed independently.

### 6c. Completion → notify creator

When any instance is toggled complete, email the **original creator** of that
task. (Creator only in v1; a watcher list can come later.)

---

## 7. Ping & escalation engine

A scheduled job (Render Cron) runs once each morning (**07:00 ET**) and does the
following:

1. **Determine due tasks.** For each open task, decide whether today is a ping
   day based on its cadence and last ping date. (Daily = every morning;
   every-3-days = every third morning; weekly = same weekday each week, etc.)
2. **Consolidate by recipient.** Group all of today's due tasks by recipient
   email address. Each recipient gets **exactly one "your open tasks" email**
   listing every due task (title, property, priority, age) with a **link into
   the interface** to view and toggle them. No per-task emails.
3. **Record the ping.** Append to a `ping_log` (task_id, recipient, sent_at) and
   increment the task's ping count. This log is also the raw material for
   cycle-time reporting.
4. **Escalate.** When a task's ping count reaches its escalation threshold and it
   is still open, add it to an **escalation digest** sent to: the property's
   **regional manager + Geoff + Steve**. NC properties have no regional manager,
   so NC escalations go to **Geoff + Steve only**. v1: escalate once at the
   threshold; the task keeps pinging normally afterward. (Re-escalation cadence
   can be added later — flag as a future enhancement, don't build it now.)

Email provider: **Resend**. A sending domain must be verified before pinging real
staff (use `cedargrovecp.com` or `covenantpropertyservices.com`;
`MAIL_FROM` like `Cedar Grove Tasks <tasks@cedargrovecp.com>`). For early testing
before domain verification, Resend allows sends to your own account email via
`onboarding@resend.dev` — use that locally, verify the domain before M6 ships to
real recipients.

**Email only. No SMS** (SMS requires A2P 10DLC carrier registration — weeks of
lead time; explicitly out of scope).

---

## 8. Reporting & history (capture-now, report-light)

Capture every field needed for later analytics from day one; ship two simple
reports in v1.

**Capture per task instance:** `created_at`, `created_by`, `property_id`,
`region_id`, `priority`, `job_function`, the full `ping_log`, `escalated_at`,
`completed_at`, `completed_by`, and the derived `days_to_complete`.

**v1 reports:**
- **Outstanding items** — filter by property / region / person / priority, over a
  specified date range.
- **Completed items** — over a specified date range, with time-to-complete shown.

**Later (do not build in v1, just keep the data clean for it):** median
days-to-close by priority, by property, by job function — the "best practices"
analysis. Geoff and Claude will design this view together when v1 is stable; do
not over-engineer the schema now beyond capturing the fields above.

---

## 9. Brand & interface

Translate Cedar Grove's house palette into a small web token set. **This is a
web app, not a Word document** — do not apply docx letterhead/spacing rules.

| Token | Value | Use |
|---|---|---|
| `--cg-green` | `#334E44` | Primary / headers / nav |
| `--cg-copper` | `#B36629` | Accent / primary action buttons |
| `--cg-cream` | `#F3E4D2` | Background tint / cards |
| Text | near-black on cream/white | Body |
| Font | Arial / clean system sans stack | All UI |

**Logo:** Geoff to drop the Cedar Grove logo into `public/cedar-grove-logo.svg`
(or `.png`). Reference it in the header; do not invent or generate a logo.

**Interface principles (state these explicitly so the default chunky Tailwind
look is avoided):**
- Ergonomic, clean, dense-but-readable. **Modest padding and button sizes** — not
  oversized. Tighter than Tailwind defaults.
- Scannable lists; due date / priority visible at a glance; one-tap complete.
- Semantic HTML for accessibility (keyboard nav, screen-reader labels, WCAG AA
  contrast — Tailwind does not provide these by default).
- **Desktop-first for the v1 build and testing**, but **mobile is a required
  target** — on-site staff will toggle tasks from phones. Keep layouts
  responsive from the start; do a dedicated mobile pass before production.

---

## 10. Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend + API | Next.js 14 (App Router) | Single repo. |
| Language | TypeScript (strict) | Role names are load-bearing for security; types catch typos at build. |
| Database | Postgres on **Render (paid plan)** | Free Render Postgres expires after 90 days and deletes data — never use it for staging or prod. |
| Auth | **Clerk** | Google OAuth for both Workspace domains + email/password invite for outside allowlisted users. Sign-up restricted to the two domains + allowlist. |
| Email | **Resend** | Verify sending domain before real sends. |
| Scheduler | **Render Cron Job** | Daily 07:00 ET digest + escalation; calls an authed internal endpoint. |
| Hosting | **Render Web Service** | GitHub-connected, auto-deploys on push (staging). |
| Styling | Tailwind CSS | Plus the brand tokens in §9; semantic HTML for ADA. |
| Infra-as-code | `render.yaml` (Render Blueprint) | All services + DB defined in code. |

---

## 11. Scope & compliance (v1: no tenant data)

In scope: internal staff, properties, regions, tasks, pings, escalations,
reports, audit log.

**Out of scope for v1 (flag any request to add these as a re-plan, not an
additive change):**
- Tenant/resident records, lease data, rent, screening/background/credit data,
  any field-level PII about residents or applicants.
- SMS / push notifications.
- The property-reporting dashboard (leads, applications, delinquencies — separate
  project).

| Regulation | Applies in v1? | Why |
|---|---|---|
| FCRA | **No** | No credit/background data. Keep screening in a dedicated platform; never here. |
| Fair Housing + state analogs | Minimally | No applicant/tenant data. Task **notes fields must warn against capturing protected-class info** about residents. |
| ADA (UI) | **Yes** | Semantic HTML, keyboard nav, screen-reader labels, WCAG AA contrast. |
| State landlord-tenant law | Indirectly | The app must NOT encode legal logic (notice periods, eviction timelines). |

If a proposed change would introduce tenant data, screening data, or any
resident PII, **STOP and flag it.**

---

## 12. Security-critical files (build first, audit hardest)

These contain the rules that keep one property's data from leaking to another.
Build and test them in isolation **before** any feature work, and call out any
change to them explicitly in the change summary:

- `middleware.ts` — Clerk middleware, default-deny.
- `lib/auth.ts` — `getCurrentUser`, `getAllowedPropertyIds`.
- `lib/rbac.ts` — `requireRole`, `hasRole`, the property hierarchy / visibility
  rule from §5.
- `lib/audit.ts` — `writeAuditEntry`; **all writes** and **sensitive reads**
  (user list, role/property assignment screens, the audit log itself) go through
  it. General navigation is not logged.

---

## 13. Repository layout

```
cedar-grove-tasks/
├── CLAUDE.md                 ← this file
├── SEED_DATA.md              ← real properties/regions/staff/role mailboxes
├── README.md                 ← short overview, points here
├── render.yaml               ← Render Blueprint (staging, then prod)
├── .env.example              ← env var docs (no real values)
├── package.json / tsconfig.json / next.config.mjs / tailwind.config.ts
├── middleware.ts             ← (M2) Clerk, default-deny
├── app/
│   ├── layout.tsx / page.tsx
│   ├── (auth)/               ← (M2) sign-in / sign-up
│   ├── my-tasks/             ← (M5) the assignee view
│   ├── tasks/                ← (M5) create/edit, list, detail
│   ├── reports/              ← (M7) outstanding / completed
│   ├── admin/                ← (M4) user/role/property management
│   └── api/
│       ├── health/           ← (M1) DB connectivity check
│       ├── webhooks/clerk/   ← (M2) mirror Clerk users into our users table
│       └── cron/digest/      ← (M6) daily ping + escalation job (authed)
├── lib/
│   ├── db.ts (M1) · env.ts (M1) · auth.ts (M3) · rbac.ts (M3)
│   ├── audit.ts (M4) · email.ts (M6, Resend) · schedule.ts (M6, cadence logic)
├── db/
│   ├── schema.sql            ← (M1) canonical schema
│   ├── seed.sql              ← (M1) generated from SEED_DATA.md
│   └── migrations/           ← numbered SQL (0001_init.sql, …)
└── scripts/apply-migrations.ts
```

---

## 14. Milestone plan

Build in order. **After each milestone deploys to staging, STOP and wait for
Geoff to verify before starting the next.**

- **M0 — Scaffold.** Next.js + TS + Tailwind + brand tokens, `render.yaml`,
  `.env.example`, deploy an empty app to a Render staging web service.
- **M1 — Database.** Schema, migrations, `db.ts`, `env.ts`, `/api/health`.
  **Seed properties, regions, role mailboxes, and the staff roster from
  `SEED_DATA.md`.**
- **M2 — Auth.** Clerk Google OAuth for both domains + invite allowlist;
  default-deny `middleware.ts`; Clerk→users mirror webhook. Verify a new sign-in
  lands as `read_only` with nothing visible.
- **M3 — RBAC core (security-critical).** `lib/auth.ts`, `lib/rbac.ts`, the
  visibility/hierarchy rule (§5), `getAllowedPropertyIds`. Test cross-property
  isolation hard before moving on.
- **M4 — Admin + audit.** Super-admins (and Cara/Jackie) grant access, assign
  roles and properties; `lib/audit.ts` logging.
- **M5 — Tasks.** Create/edit with autocomplete assignee, role/email/person
  targets, multi-property fan-out, `my-tasks` view, toggle complete, notify
  creator. Capture all cycle-time fields from the start.
- **M6 — Ping & escalation engine.** Render Cron + Resend; consolidated daily
  email; escalation digest to RM + Geoff + Steve (Geoff + Steve for NC).
- **M7 — Reports.** Outstanding and completed views with date-range, property,
  region, person, priority filters.
- **M8 — Polish + mobile + production.** Brand/UX polish, dedicated mobile
  responsive pass, separate production environment (own Clerk instance + own
  Postgres, `autoDeploy: false`, manual promotion).

---

## 15. Workflow rules (recap)

- Stop after each milestone; let Geoff test staging first.
- Never put a secret in chat — Render/Clerk dashboards or `.env.local` only.
- Prefer editing existing files to creating new ones; flag any file added
  outside the layout above.
- Treat changes to `middleware.ts`, `lib/auth.ts`, `lib/rbac.ts`, `lib/audit.ts`
  as security-critical and say so in the summary.
- No tenant/resident PII, ever, in v1.
