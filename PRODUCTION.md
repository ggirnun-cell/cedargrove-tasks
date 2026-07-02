# Production setup runbook (M8)

Staging (`main` branch) stays the place to test. **Production is a fully separate
environment** — its own database, its own Clerk instance, its own URL — so
testing on staging can never affect live users. Production deploys **manually**
(no auto-deploy): you promote a known-good build when you're ready.

> This is a real setup with a few external prerequisites (DNS + a Google OAuth
> app). Do it with Claude guiding each step — don't rush it solo.

## The pieces production needs

| Piece | What | Who / prerequisite |
|---|---|---|
| **Git branch** | a `production` branch; prod deploys from it | Claude creates it |
| **Postgres (prod)** | a second **paid** Render database, separate from staging | Render dashboard (~$6/mo) |
| **Clerk (prod instance)** | Clerk requires a *production* instance, separate from the dev one | **needs DNS + Google OAuth** (below) |
| **Resend** | reuse the already-verified `cedargrovecp.com` sender | already done ✅ |
| **Web + Cron services (prod)** | separate Render services, `autoDeploy: false` | Render dashboard |
| **Prod URL** | `…onrender.com`, or a custom domain like `tasks.cedargrovecp.com` | custom domain needs 1 DNS record (IT) |

## The two real prerequisites (need IT / a Google admin)

1. **Clerk production instance** needs:
   - A Clerk domain (e.g. `clerk.cedargrovecp.com`) → a **CNAME DNS record** IT adds
     (same kind of request as the Resend records).
   - **Your own Google OAuth credentials** (Google Cloud Console → OAuth client),
     because Clerk's shared dev Google login isn't allowed in production. A Google
     Workspace admin creates an OAuth client and pastes its ID/secret into Clerk.
2. **(Optional) custom URL** `tasks.cedargrovecp.com` → one more CNAME (IT).

Everything else (databases, services, env vars) is dashboard work we do together.

## Order of operations (high level)

1. Claude creates the `production` branch and adds prod services to `render.yaml`
   (`autoDeploy: false`, prod DB, prod env group).
2. You create the **Clerk production instance** (DNS CNAME + Google OAuth) — the
   long-lead item; kick this off with IT first.
3. Apply the blueprint → creates prod DB + prod web + prod cron.
4. Set prod env vars: prod Clerk keys, `MAIL_FROM`, `APP_BASE_URL` (prod URL).
5. Run migrations + `npm run db:seed` against the prod DB (via prod Shell).
6. Verify prod `/api/health` and a test sign-in.
7. **Promotion from then on:** merge `main` → `production`, then click **Manual
   Deploy** on the prod web service. That's the "manual promotion."

## Interim option

Staging is stable and fully functional today. If IT bandwidth for the Clerk
prod prerequisites isn't available yet, it's reasonable to **use staging as the
working system short-term** and stand up formal production later — the only real
downside is that testing new changes happens in the same place people work.
