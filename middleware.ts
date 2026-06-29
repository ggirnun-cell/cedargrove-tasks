// SECURITY-CRITICAL (CLAUDE.md §12). Default-deny at the authentication layer.
//
// Every route requires an authenticated Clerk session EXCEPT the explicit public
// list below. Unauthenticated requests are redirected to sign-in. This is the
// outer gate; the inner gate — whether an authenticated user is *provisioned*
// and what they may SEE — is enforced in lib/auth.ts against our database, and
// (M3) in lib/rbac.ts. A new sign-in passes this gate but still sees nothing
// until a super-admin grants access.
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/clerk", // Clerk → users mirror; verified by signature, not session.
  "/api/cron/digest", // ping engine; authed by CRON_SECRET, not a session.
  "/api/health", // uptime probe; no user data.
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect(); // not signed in → redirect to sign-in.
  }
});

export const config = {
  matcher: [
    // Run on everything except Next internals and static files...
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // ...and always on API routes.
    "/(api|trpc)(.*)",
  ],
};
