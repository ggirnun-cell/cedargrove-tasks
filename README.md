# Cedar Grove · Task Tracker

Internal, staff-only task tracker for Cedar Grove Capital and Covenant Property
Services. Create a task, assign it to a person / role mailbox / property, and the
system pings assignees on a cadence until it's done — with escalation and
reporting.

> **The full spec lives in [`CLAUDE.md`](./CLAUDE.md).** Read it before changing
> anything. Seed data (real properties, staff, role mailboxes) is in
> [`SEED_DATA.md`](./SEED_DATA.md).

## Status

Built in milestones (see `CLAUDE.md` §14). **Currently at M6 — ping engine.**
Immediate ping on task creation + a daily 7am consolidated digest per recipient,
escalation to the regional manager + corporate (corporate-only where there's no
RM), all via Resend, driven by a Render cron job hitting the authed
`/api/cron/digest`. Reports are next (M7).

Database commands: `npm run db:migrate` (apply schema), `npm run db:seed`
(apply schema + load SEED_DATA.md). Both need `DATABASE_URL` set.

## Stack

Next.js 14 (App Router) · TypeScript (strict) · Tailwind · Postgres on Render ·
Clerk auth · Resend email · Render Cron + Web Service.

## Local development

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:3000
```

Other scripts: `npm run build` (production build), `npm start` (serve the build),
`npm run typecheck` (TypeScript, no emit), `npm run lint`.

## Environment

Copy `.env.example` to `.env.local` and fill in values as each milestone needs
them. M0 needs none. **Never commit `.env.local` or paste secrets into chat** —
use the Render / Clerk dashboards.

## Deploy

`render.yaml` defines the Render staging web service. Connect the GitHub repo as
a Render Blueprint; pushes to `main` auto-deploy to staging. Production is a
separate, manually-promoted environment (added in M8).
