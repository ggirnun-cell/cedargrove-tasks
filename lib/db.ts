// Postgres access for the app (Next.js server runtime).
//
// The connection pool is created lazily on first query, so importing this module
// during `next build` (which has no DATABASE_URL) is safe. In development the
// pool is cached on `globalThis` to survive hot-reloads without leaking
// connections.
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { requireEnv } from "./env";

// Render-hosted Postgres requires TLS; a local Postgres typically does not.
function sslFor(connectionString: string): false | { rejectUnauthorized: boolean } {
  const isLocal = /@(localhost|127\.0\.0\.1)\b/.test(connectionString);
  // Render's certs are managed; we don't pin them, so disable strict CA checks.
  return isLocal ? false : { rejectUnauthorized: false };
}

const globalForPool = globalThis as unknown as { __cgPool?: Pool };

export function getPool(): Pool {
  if (!globalForPool.__cgPool) {
    const connectionString = requireEnv("DATABASE_URL");
    globalForPool.__cgPool = new Pool({
      connectionString,
      ssl: sslFor(connectionString),
      max: 5, // modest cap — staff-internal traffic is low; keeps us well under DB limits.
    });
  }
  return globalForPool.__cgPool;
}

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params as never);
}

// Run `fn` inside a single transaction; commit on success, roll back on throw.
// Use for multi-statement writes that must be atomic (e.g. re-syncing a user's
// property assignments together with its audit entry).
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}
