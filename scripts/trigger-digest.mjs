// Render cron entry point. POSTs to the web service's authed digest endpoint.
// Uses only Node's global fetch — no dependencies. Reads APP_BASE_URL and
// CRON_SECRET from the cron service's environment.
const base = process.env.APP_BASE_URL?.replace(/\/$/, "");
const secret = process.env.CRON_SECRET;

if (!base || !secret) {
  console.error("APP_BASE_URL and CRON_SECRET must be set.");
  process.exit(1);
}

const url = `${base}/api/cron/digest`;
try {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  console.log(`digest trigger → ${res.status}: ${body}`);
  if (!res.ok) process.exit(1);
} catch (err) {
  console.error("digest trigger failed:", err);
  process.exit(1);
}
